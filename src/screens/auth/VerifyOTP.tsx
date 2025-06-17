import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  Vibration,
  Alert,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import messaging from '@react-native-firebase/messaging';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';

import theme from '../../shared/constant/theme';
import Input from '../../shared/components/Input';
import Button from '../../shared/components/Button';
import axios from '../../utils/axiosInstance';

type RootStackParamList = {
  VerifyOTP: { phone: string };
  ChatList: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'VerifyOTP'>;

const VerifyOTPScreen: React.FC<Props> = ({ route, navigation }) => {
  const { phone } = route.params;

  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(180);
  const intervalRef = useRef<NodeJS.Timer | null>(null);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const headingSlide = useRef(new Animated.Value(20)).current;
  const logoAnim = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(logoAnim, {
        toValue: 1,
        friction: 5,
        useNativeDriver: true,
      }),
      Animated.spring(headingSlide, {
        toValue: 0,
        friction: 5,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    startTimer();
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const startTimer = () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimer(180);
    intervalRef.current = setInterval(() => {
      setTimer(prev => {
        if (prev <= 1 && intervalRef.current) clearInterval(intervalRef.current);
        return prev - 1;
      });
    }, 1000);
  };

  const formatTimer = (seconds: number) => {
    const m = Math.floor(seconds / 60)
      .toString()
      .padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    Toast.show({
      type,
      text1: message,
      position: 'top',
      visibilityTime: 3000,
    });
  };

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 6, duration: 100, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
    ]).start();
  };

  const resendOTP = async () => {
    try {
      setLoading(true);
      await axios.post('/auth/send-otp', { phone });
      setOtp('');
      startTimer();
      showToast('success', 'OTP resent successfully');
    } catch (error: any) {
      console.error('Resend error:', error.message);
      showToast('error', 'Failed to resend OTP');
    } finally {
      setLoading(false);
    }
  };

  const verifyOTP = async () => {
    if (otp.length !== 6) {
      triggerShake();
      Vibration.vibrate(50);
      showToast('error', 'Enter a valid 6-digit OTP');
      return;
    }

    try {
      setLoading(true);
      const fcmToken = await messaging().getToken();
      const res = await axios.post('/auth/verify-otp', { phone, otp, fcmToken });

      const { token, user } = res.data;
      await AsyncStorage.setItem('token', token);
      await AsyncStorage.setItem('user', JSON.stringify(user));

      await axios.post('/user/update-fcm', {
        userId: user._id,
        fcmToken,
      });

      navigation.replace('ChatList');
    } catch (err: any) {
      const message =
        err.response?.data?.twoFactorResponse?.Details === 'OTP Expired'
          ? 'OTP expired. Please resend.'
          : err.response?.data?.message || 'Verification failed.';
      showToast('error', message);
    } finally {
      setLoading(false);
    }
  };

  const animateAndVerify = () => {
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }),
    ]).start(verifyOTP);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.fullScreen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.ellipse1} />
          <View style={styles.ellipse2} />
          <View style={styles.ellipse3} />

          <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
            <Animated.View style={[styles.cardContainer, { opacity: fadeAnim }]}>
            <Animated.Image
                source={require('../../assets/logo.png')}
                style={[styles.logo, { transform: [{ scale: logoAnim }] }]}
                resizeMode="contain"
              />
            <Animated.Text
                style={[
                  styles.heading,
                  {
                    transform: [{ translateY: headingSlide }],
                    opacity: fadeAnim,
                  },
                ]}
              >Enter OTP sent to
              </Animated.Text>
              <Text style={styles.subheading}>+91 {phone}</Text>

              <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                <Input
                  label="OTP"
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="Enter 6-digit OTP"
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </Animated.View>

              <Button
                title="Verify OTP"
                onPress={animateAndVerify}
                loading={loading}
                scaleAnim={btnScale}
              />

              <Text style={styles.timer}>Expires in: {formatTimer(timer)}</Text>

              {timer <= 0 && (
                <Text style={styles.resend} onPress={resendOTP}>
                  Resend OTP
                </Text>
              )}
            </Animated.View>
          </ScrollView>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Powered by ChatFusion</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  ellipse1: {
    position: 'absolute',
    top: -180,
    left: -120,
    width: 350,
    height: 350,
    borderRadius: 225,
    backgroundColor: theme.colors.secondary,
    opacity: 0.06,
    zIndex: -1,
  },
  ellipse2: {
    position: 'absolute',
    top: -160,
    right: 100,
    width: 250,
    height: 250,
    borderRadius: 200,
    backgroundColor: theme.colors.primary,
    opacity: 0.08,
    zIndex: -1,
  },
  ellipse3: {
    position: 'absolute',
    bottom: -200,
    left: -80,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: theme.colors.accent,
    opacity: 0.05,
    zIndex: -1,
  },
  scroll: {
    flexGrow: 1,
    marginTop: 60,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.xl,
  },
  cardContainer: {
    padding: theme.spacing.l,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 20,
  },
  logo: {
    width: 90,
    height: 90,
    alignSelf: 'center',
    marginBottom: theme.spacing.l - 4,
  },
  heading: {
    fontSize: theme.fontSizes.title,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  subheading: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.subtext,
    textAlign: 'center',
    marginBottom: theme.spacing.l,
  },
  timer: {
    marginTop: theme.spacing.m,
    textAlign: 'center',
    color: theme.colors.subtext,
    fontSize: theme.fontSizes.caption,
  },
  resend: {
    marginTop: theme.spacing.s,
    textAlign: 'center',
    color: theme.colors.primary,
    fontWeight: '600',
    fontSize: theme.fontSizes.body,
  },
  footerContainer: {
    paddingVertical: theme.spacing.s,
    alignItems: 'center',
  },
  footerText: {
    fontSize: theme.fontSizes.caption,
    color: theme.colors.subtext,
    textAlign: 'center',
  },
});

export default VerifyOTPScreen;
