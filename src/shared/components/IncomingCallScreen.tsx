import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  BackHandler,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import theme from '../constant/theme';
import { firebaseConfig } from '../../config/firebase-config';

type RootStackParamList = {
  IncomingCallScreen: {
    callId: string;
    callerName: string;
    callerAvatar?: string;
  };
  VideoCallScreen: { callId: string };
  ChatList: undefined;
};

type Props = NativeStackScreenProps<RootStackParamList, 'IncomingCallScreen'>;

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const IncomingCallScreen: React.FC<Props> = ({ route, navigation }) => {
  const { callId, callerName, callerAvatar } = route.params;
  const callRef = doc(db, 'calls', callId);

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => true);

    const unsub = onSnapshot(callRef, snapshot => {
      const data = snapshot.data();
      if (!data) return;
      if (data.status === 'rejected' || data.status === 'ended') {
        navigation.goBack();
      }
    });

    return () => {
      unsub();
      backHandler.remove();
    };
  }, []);

  const onAccept = async () => {
    await updateDoc(callRef, { status: 'accepted' });
    navigation.replace('VideoCallScreen', { callId });
  };

  const onDecline = async () => {
    await updateDoc(callRef, { status: 'rejected' });
    navigation.replace('ChatList');
  };

  return (
    <View style={styles.container}>
      {callerAvatar ? (
        <Image source={{ uri: callerAvatar }} style={styles.avatar} />
      ) : (
        <View style={styles.avatarPlaceholder}>
          <Text style={styles.avatarText}>{callerName?.[0] || '?'}</Text>
        </View>
      )}

      <Text style={styles.name}>{callerName}</Text>
      <Text style={styles.callingText}>Incoming Video Call</Text>

      <View style={styles.actions}>
        <TouchableOpacity onPress={onDecline} style={[styles.button, styles.decline]}>
          <Ionicons name="call-outline" size={30} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={onAccept} style={[styles.button, styles.accept]}>
          <Ionicons name="checkmark-outline" size={30} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default IncomingCallScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.dark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarText: {
    fontSize: 48,
    color: theme.colors.white,
    fontWeight: 'bold',
  },
  name: {
    fontSize: theme.fontSizes.title,
    color: theme.colors.white,
    fontWeight: '600',
  },
  callingText: {
    fontSize: theme.fontSizes.body,
    color: theme.colors.subtext,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    marginTop: 40,
    width: '60%',
    justifyContent: 'space-between',
  },
  button: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  decline: {
    backgroundColor: theme.colors.border,
  },
  accept: {
    backgroundColor: theme.colors.success,
  },
});
