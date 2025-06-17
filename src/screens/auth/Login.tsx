import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Animated,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  ScrollView,
  Keyboard,
  Platform,
  Vibration,
  Image,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Toast from 'react-native-toast-message';
import axios from '../../utils/axiosInstance';
import theme from '../../shared/constant/theme';
import Input from '../../shared/components/Input';
import debounce from 'lodash.debounce';
import Button from '../../shared/components/Button';

type RootStackParamList = {
  Login: undefined;
  VerifyOTP: { phone: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'Login'>;

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoAnim = useRef(new Animated.Value(0.5)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const headingSlide = useRef(new Animated.Value(20)).current;
  const shakeAnim = useRef(new Animated.Value(0)).current;

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

  const handleOTP = async () => {
    if (!/^\d{10}$/.test(phone)) {
      triggerShake();
      Vibration.vibrate(50);
      showToast('error', 'Please enter a valid 10-digit phone number');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/auth/send-otp', { phone });
      showToast('success', 'OTP sent successfully');
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start(() => navigation.navigate('VerifyOTP', { phone }));
    } catch (err: any) {
      console.error('OTP Error:', err.response?.data || err.message);
      showToast('error', err.response?.data?.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const debouncedHandleOTP = useCallback(debounce(handleOTP, 1000, { leading: true }), [phone]);

  const animateAndSendOTP = () => {
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }),
    ]).start(debouncedHandleOTP);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.fullScreen}
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
              >
                Welcome Back
              </Animated.Text>

              <Text style={styles.subtext}>Login using your phone number</Text>

              <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
                <Input
                  label="Phone Number"
                  prefix="+91"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter 10-digit number"
                  keyboardType="number-pad"
                  maxLength={10}
                />
              </Animated.View>

              <Button
                title="Send OTP"
                onPress={animateAndSendOTP}
                loading={loading}
                scaleAnim={btnScale}
              />

              <Text style={styles.termsText}>
                By continuing, you agree to our{' '}
                <Text style={styles.linkText}>Terms</Text> &{' '}
                <Text style={styles.linkText}>Privacy Policy</Text>.
              </Text>
            </Animated.View>
          </ScrollView>

          <Animated.View style={styles.footerContainer}>
            <Text style={styles.footerText}>Powered by ChatFusion</Text>
          </Animated.View>
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
    marginBottom: theme.spacing.xs / 2,
  },
  subtext: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.subtext,
    textAlign: 'center',
    marginBottom: theme.spacing.l,
  },
  termsText: {
    marginTop: theme.spacing.m + 4,
    fontSize: theme.fontSizes.caption,
    color: theme.colors.subtext,
    textAlign: 'center',
    lineHeight: theme.fontSizes.body + 2,
  },
  linkText: {
    color: theme.colors.primary,
    fontWeight: '600',
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

export default LoginScreen;
