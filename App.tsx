import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import axios from './src/utils/axiosInstance';
import Toast from 'react-native-toast-message';

import LoginScreen from './src/screens/auth/Login';
import VerifyOTPScreen from './src/screens/auth/VerifyOTP';
import ChatList from './src/screens/Chat/ChatList';
import ContactsScreen from './src/screens/Contact/Contacts';
import ChatScreen from './src/screens/Chat/ChatScreen';
import Splash from './src/screens/Splash/Splash';

import {
  createNotificationChannel,
  requestUserPermission,
  setupForegroundMessageHandler,
} from './src/config/NotificationService';

export type RootStackParamList = {
  Login: undefined;
  VerifyOTP: undefined;
  ChatList: undefined;
  Contacts: undefined;
  Chat: { conversationId?: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

const App: React.FC = () => {
  const [initialRoute, setInitialRoute] = useState<
    keyof RootStackParamList | null
  >(null);
  const [showSplash, setShowSplash] = useState<boolean>(true);

  const saveFcmToken = async () => {
    const token = await requestUserPermission();
    const userString = await AsyncStorage.getItem('user');
    const user = userString ? JSON.parse(userString) : null;

    if (!user?._id || !token) return;

    await AsyncStorage.setItem(`fcm_${user._id}`, token);

    try {
      await axios.post('/user/save-fcm', {
        userId: user._id,
        fcmToken: token,
      });
    } catch (error: any) {
      console.error(
        'Failed to save FCM token',
        error?.response?.data || error.message,
      );
    }
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const user = await AsyncStorage.getItem('user');

        if (token && user) {
          setInitialRoute('ChatList');
        } else {
          setInitialRoute('Login');
        }
      } catch (e) {
        console.error('Error checking AsyncStorage', e);
        setInitialRoute('Login');
      } finally {
        setShowSplash(false);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    saveFcmToken();
    createNotificationChannel();
    setupForegroundMessageHandler();
  }, []);

  if (showSplash || !initialRoute) {
    return <Splash />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={initialRoute}>
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="VerifyOTP"
          component={VerifyOTPScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="ChatList"
          component={ChatList}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Chat"
          component={ChatScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="Contacts"
          component={ContactsScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
      <Toast />
    </NavigationContainer>
  );
};

export default App;
