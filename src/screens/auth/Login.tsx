import React, { useState } from 'react';
import {
  View,
  TextInput,
  Button,
  Alert,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import axios from '../../utils/axiosInstance';

type Props = NativeStackScreenProps<any, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const sendOTP = async () => {
    if (!phone || phone.length !== 10) {
      Alert.alert(
        'Invalid Phone',
        'Please enter a valid 10-digit phone number',
      );
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/auth/send-otp', { phone });
      console.log('OTP sent', res.data);
      navigation.navigate('VerifyOTP', { phone });
    } catch (error: any) {
      console.error('OTP send error', error.response?.data || error.message);
      Alert.alert(
        'Error',
        error.response?.data?.message || 'Failed to send OTP',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Phone Number</Text>
      <TextInput
        style={styles.input}
        keyboardType="phone-pad"
        placeholder="Enter 10-digit number"
        value={phone}
        onChangeText={setPhone}
        maxLength={10}
      />
      {loading ? (
        <ActivityIndicator size="large" color="#007bff" />
      ) : (
        <Button title="Send OTP" onPress={sendOTP} />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { padding: 20, flex: 1, justifyContent: 'center' },
  label: { fontSize: 16, marginBottom: 10, fontWeight: '500' },
  input: {
    borderWidth: 1,
    padding: 12,
    marginBottom: 20,
    borderRadius: 6,
    fontSize: 16,
    borderColor: '#ccc',
  },
});

export default LoginScreen;
