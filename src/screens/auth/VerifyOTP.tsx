import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  TextInput,
  Button,
  Alert,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import axios from '../../utils/axiosInstance';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getMessaging, getToken } from '@react-native-firebase/messaging';
import { getApp } from '@react-native-firebase/app';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'VerifyOTP'>;

const VerifyOTPScreen: React.FC<Props> = ({ route, navigation }) => {
  const { phone } = route.params;
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(180);
  const intervalRef = useRef<NodeJS.Timer | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1 && intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const resendOTP = async () => {
    try {
      setLoading(true);
      const res = await axios.post('/auth/send-otp', { phone });
      console.log('OTP resent', res.data);
      setOtp('');
      setTimer(180);
      Alert.alert('OTP Sent', 'A new OTP has been sent.');

      if (intervalRef.current) clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => {
        setTimer(prev => {
          if (prev <= 1 && intervalRef.current)
            clearInterval(intervalRef.current);
          return prev - 1;
        });
      }, 1000);
    } catch (error: any) {
      console.error('OTP resend error', error.message);
      Alert.alert('Error', 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      Alert.alert('Invalid OTP', 'Please enter a 6-digit OTP.');
      return;
    }

    try {
      setLoading(true);
      const fcmToken = await getToken(getMessaging(getApp()));

      const res = await axios.post('/auth/verify-otp', {
        phone,
        otp,
        fcmToken,
      });

      const { token, user } = res.data;

      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      await axios.post('/user/update-fcm', {
        userId: user._id,
        fcmToken,
      });
      navigation.replace('ChatList');
    } catch (err: any) {
      console.error('Verification failed', err.response?.data || err.message);

      const message =
        err.response?.data?.twoFactorResponse?.Details === 'OTP Expired'
          ? 'Your OTP has expired. Please request a new one.'
          : err.response?.data?.message || 'Verification failed.';

      Alert.alert('Verification Error', message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Enter OTP sent to {phone}</Text>
      <TextInput
        placeholder="6-digit OTP"
        keyboardType="number-pad"
        value={otp}
        onChangeText={setOtp}
        style={styles.input}
        maxLength={6}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <Button title="Verify OTP" onPress={verifyOTP} disabled={timer <= 0} />
      )}

      <Text style={styles.timer}>Expires in: {formatTimer(timer)}</Text>

      {timer <= 0 && (
        <TouchableOpacity onPress={resendOTP}>
          <Text style={styles.resend}>Resend OTP</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, justifyContent: 'center' },
  heading: {
    fontSize: 18,
    marginBottom: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    padding: 12,
    marginBottom: 20,
    borderRadius: 6,
    fontSize: 16,
  },
  timer: {
    marginTop: 16,
    fontSize: 14,
    textAlign: 'center',
    color: '#555',
  },
  resend: {
    marginTop: 12,
    textAlign: 'center',
    color: '#007bff',
    textDecorationLine: 'underline',
    fontSize: 16,
  },
});

export default VerifyOTPScreen;
