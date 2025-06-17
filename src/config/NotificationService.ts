import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';

export const requestUserPermission = async () => {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('Notification permission granted', authStatus);
    await notifee.requestPermission();
    return await getFcmToken();
  } else {
    console.warn('Notification permission denied');
    return null;
  }
};

export const getFcmToken = async () => {
  try {
    const token = await messaging().getToken();
    console.log('FCM Token', token);
    return token;
  } catch (err) {
    console.log('Failed to get FCM token', err);
    return null;
  }
};

export const setupForegroundMessageHandler = () => {
  messaging().onMessage(async remoteMessage => {
    console.log('Foreground message', remoteMessage);

    await notifee.displayNotification({
      title: remoteMessage.notification?.title || 'New Message',
      body: remoteMessage.notification?.body || 'You received a new message.',
      android: {
        channelId: 'default',
        smallIcon: 'ic_launcher',
        importance: AndroidImportance.HIGH,
        pressAction: {
          id: 'default',
        },
      },
    });
  });
};

export const createNotificationChannel = async () => {
  await notifee.createChannel({
    id: 'default',
    name: 'Default Channel',
    importance: AndroidImportance.HIGH,
  });
};
