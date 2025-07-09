import React, { useEffect, useRef, useState } from 'react';
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
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import 'react-native-gesture-handler';

import LoginScreen from './src/screens/auth/Login';
import VerifyOTPScreen from './src/screens/auth/VerifyOTP';
import ChatList from './src/screens/Chat/ChatList';
import ContactsScreen from './src/screens/Contact/Contacts';
import ChatScreen from './src/screens/Chat/ChatScreen';
import Splash from './src/screens/Splash/Splash';
import ProfileSetupScreen from './src/screens/auth/ProfileSetup';
import ImageEditorScreen from './src/screens/Image/ImageEditorScreen';
import CropImageScreen from './src/screens/Image/CropImageScreen';
import VideoCallScreen from './src/shared/components/VideoCallScreen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

export type RootStackParamList = {
  Login: undefined;
  VerifyOTP: undefined;
  ChatList: undefined;
  Contacts: undefined;
  Chat: { conversationId?: string };
  ProfileSetup: undefined;
  ImageEditor: undefined;
  CropImage: undefined;
  VideoCallScreen: {
    callId: string;
    callerName?: string;
    callerAvatar?: string;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const app = getApps().length
  ? getApps()[0]
  : initializeApp(require('./src/config/firebase-config').firebaseConfig);
const db = getFirestore(app);

const App: React.FC = () => {
  const [initialRoute, setInitialRoute] = useState<
    keyof RootStackParamList | null
  >(null);
  const [showSplash, setShowSplash] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const navigationRef = useNavigationContainerRef();

  const saveFcmToken = async () => {
    const authStatus = await messaging().requestPermission();
    const enabled =
      authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
      authStatus === messaging.AuthorizationStatus.PROVISIONAL;

    if (!enabled) return;

    const token = await messaging().getToken();
    const userStr = await AsyncStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;

    if (user?._id && token) {
      await AsyncStorage.setItem(`fcm_${user._id}`, token);
      try {
        await axios.post('/user/save-fcm', {
          userId: user._id,
          fcmToken: token,
        });
      } catch (err: any) {
        console.error(
          'Failed to save FCM token:',
          err?.response?.data || err.message,
        );
      }
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
    } catch (err) {
      console.warn('Status update failed', err);
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
          setInitialRoute(
            user.name && user.about ? 'ChatList' : 'ProfileSetup',
          );
        } else {
          setInitialRoute('Login');
        }
      } catch (e) {
        console.error('Auto-login error', e);
        setInitialRoute('Login');
      } finally {
        setShowSplash(false);
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!currentUser?._id) return;

    updateUserStatus(true);
    const sub = AppState.addEventListener(
      'change',
      (nextState: AppStateStatus) => {
        updateUserStatus(nextState === 'active');
      },
    );

    return () => {
      updateUserStatus(false);
      sub.remove();
    };
  }, [currentUser]);

  useEffect(() => {
    notifee.createChannel({
      id: 'default',
      name: 'Default Channel',
      importance: AndroidImportance.HIGH,
    });
    saveFcmToken();
  }, []);

  if (showSplash || !initialRoute) return <Splash />;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <NavigationContainer ref={navigationRef}>
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
          <Stack.Screen
            name="ImageEditor"
            component={ImageEditorScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="CropImage"
            component={CropImageScreen}
            options={{ headerShown: false }}
          />
          <Stack.Screen
            name="VideoCallScreen"
            component={VideoCallScreen}
            options={{ headerShown: false }}
          />
        </Stack.Navigator>
        <Toast />
      </NavigationContainer>
    </GestureHandlerRootView>
  );
};

export default App;
