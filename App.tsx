import React, { useEffect, useState } from 'react';
import {
  NavigationContainer,
  useNavigationContainerRef,
} from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppState, AppStateStatus } from 'react-native';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import axios from './src/utils/axiosInstance';
import Toast from 'react-native-toast-message';

import LoginScreen from './src/screens/auth/Login';
import VerifyOTPScreen from './src/screens/auth/VerifyOTP';
import ChatList from './src/screens/Chat/ChatList';
import ContactsScreen from './src/screens/Contact/Contacts';
import ChatScreen from './src/screens/Chat/ChatScreen';
import Splash from './src/screens/Splash/Splash';
import ProfileSetupScreen from './src/screens/auth/ProfileSetup';

import {
  createNotificationChannel,
  requestUserPermission,
  setupForegroundMessageHandler,
} from './src/config/NotificationService';
import { firebaseConfig } from './src/config/firebase-config';

export type RootStackParamList = {
  Login: undefined;
  VerifyOTP: undefined;
  ChatList: undefined;
  Contacts: undefined;
  Chat: { conversationId?: string };
  ProfileSetup: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const App: React.FC = () => {
  const [initialRoute, setInitialRoute] = useState<
    keyof RootStackParamList | null
  >(null);
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

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

  const updateUserStatus = async (isOnline: boolean) => {
    if (!currentUser?._id) return;
    try {
      const statusRef = doc(db, 'status', currentUser._id);
      await setDoc(
        statusRef,
        {
          isOnline,
          lastSeen: serverTimestamp(),
        },
        { merge: true },
      );
      console.log(`Status ${isOnline ? 'Online' : 'Offline'}`);
    } catch (err) {
      console.warn('Failed update status', err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        const userStr = await AsyncStorage.getItem('user');
        const user = userStr ? JSON.parse(userStr) : null;

        if (token && user) {
          setCurrentUser(user);
          if (!user.name || !user.about) {
            setInitialRoute('ProfileSetup');
          } else {
            setInitialRoute('ChatList');
          }
        } else {
          setInitialRoute('Login');
        }
      } catch (e) {
        console.error('Error checking AsyncStorage', e);
        setInitialRoute('Login');
      } finally {
        setShowSplash(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!currentUser?._id) return;

    const onChange = (nextState: AppStateStatus) => {
      updateUserStatus(nextState === 'active');
    };

    updateUserStatus(true);

    const sub = AppState.addEventListener('change', onChange);

    return () => {
      updateUserStatus(false);
      sub.remove();
    };
  }, [currentUser]);

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
          name="ProfileSetup"
          component={ProfileSetupScreen}
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
