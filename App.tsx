import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, ActivityIndicator } from 'react-native';
import axios from './src/utils/axiosInstance';

import LoginScreen from './src/screens/auth/Login';
import VerifyOTPScreen from './src/screens/auth/VerifyOTP';
import ChatList from './src/screens/Chat/ChatList';
import ContactsScreen from './src/screens/Contact/Contacts';
import ChatScreen from './src/screens/Chat/ChatScreen';
import {
  createNotificationChannel,
  requestUserPermission,
  setupForegroundMessageHandler,
} from './src/config/NotificationService';

const Stack = createNativeStackNavigator();

const App = () => {
  const [initialRoute, setInitialRoute] = useState<string | null>(null);

  const saveFcmToken = async () => {
    const token = await requestUserPermission();
    const user = JSON.parse((await AsyncStorage.getItem('user')) || '{}');

    if (!user?._id || !token) return;

    await AsyncStorage.setItem(`fcm_${user._id}`, token);

    try {
      await axios.post('/user/save-fcm', {
        userId: user._id,
        fcmToken: token,
      });
    } catch (error) {
      console.error(
        'Failed to save FCM token',
        error.response?.data || error.message,
      );
    }
  };

  useEffect(() => {
    const checkLogin = async () => {
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
      }
    };

    checkLogin();
  }, []);

  useEffect(() => {
    saveFcmToken();
    createNotificationChannel();
    setupForegroundMessageHandler();
  }, []);

  if (!initialRoute) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="blue" />
      </View>
    );
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
        <Stack.Screen name="Chat" component={ChatScreen} />
        <Stack.Screen name="Contacts" component={ContactsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default App;
