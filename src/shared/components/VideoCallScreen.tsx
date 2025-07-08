import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  StatusBar,
} from 'react-native';
import {
  mediaDevices,
  RTCPeerConnection,
  RTCSessionDescription,
  RTCIceCandidate,
  RTCView,
  MediaStream,
} from 'react-native-webrtc';
import {
  getFirestore,
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  collection,
  addDoc,
} from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../constant/theme';
import { firebaseConfig } from '../../config/firebase-config';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type RootStackParamList = {
  VideoCallScreen: { callId: string };
};

type Props = NativeStackScreenProps<RootStackParamList, 'VideoCallScreen'>;

interface Receiver {
  _id: string;
  name: string;
  avatar?: string;
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const pcConfig: RTCConfiguration = {
  iceServers: [
    {
      urls: 'turn:relay1.expressturn.com:3480',
      username: '000000002067070389',
      credential: 'uRae3avC/FjGKgGHPMdVD1PgpO4=',
    },
  ],
};

const VideoCallScreen: React.FC<Props> = ({ route, navigation }) => {
  const { callId } = route.params;
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [receiver, setReceiver] = useState<Receiver | null>(null);
  const [status, setStatus] = useState<'calling' | 'ringing' | 'connected' | 'rejected' | 'ended'>('calling');
  const [usingFrontCamera, setUsingFrontCamera] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const pc = useRef<RTCPeerConnection | null>(null);
  const unsubRef = useRef<() => void>();
  const remoteICEUnsubRef = useRef<() => void>();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const answeredRef = useRef(false);

  const cleanupAndGoBack = () => {
    console.log('[CLEANUP] Closing connection');
    pc.current?.close();
    pc.current = null;
    localStream?.getTracks().forEach(track => track.stop());
    unsubRef.current?.();
    remoteICEUnsubRef.current?.();
    navigation.replace('ChatList');
  };

  const getCurrentUser = async () => {
    const userStr = await AsyncStorage.getItem('user');
    const user = userStr ? JSON.parse(userStr) : null;
    if (user?._id) setCurrentUserId(user._id);
  };

  useEffect(() => {
    getCurrentUser();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const setupCall = async () => {
      const callRef = doc(db, 'calls', callId);
      const callSnap = await getDoc(callRef);
      const callData = callSnap.data();
      if (!callData) return;

      const isCaller = currentUserId === callData.callerId;

      setReceiver({
        _id: isCaller ? callData.receiverId : callData.callerId,
        name: isCaller ? callData.receiverName : callData.callerName,
        avatar: isCaller ? callData.receiverAvatar : callData.callerAvatar,
      });

      console.log('[INIT] Creating PeerConnection');
      pc.current = new RTCPeerConnection(pcConfig);

      pc.current.onicecandidate = async event => {
        if (event.candidate) {
          const ref = collection(db, `calls/${callId}/${isCaller ? 'offerCandidates' : 'answerCandidates'}`);
          await addDoc(ref, event.candidate.toJSON());
        }
      };

      pc.current.oniceconnectionstatechange = () => {
        console.log('[ICE] Connection State:', pc.current?.iceConnectionState);
      };

      pc.current.ontrack = event => {
        console.log('[TRACK] Remote stream received');
        if (event.streams?.[0]) setRemoteStream(event.streams[0]);
      };

      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: usingFrontCamera ? 'user' : 'environment',
          mandatory: { minWidth: 640, minHeight: 480, minFrameRate: 30 },
        },
      });

      setLocalStream(stream);
      stream.getTracks().forEach(track => pc.current?.addTrack(track, stream));

      unsubRef.current = onSnapshot(callRef, async snap => {
        const data = snap.data();
        if (!data) return;

        setStatus(data.status);

        if (['rejected', 'ended'].includes(data.status)) {
          Alert.alert('Call ended', data.status);
          cleanupAndGoBack();
        }

        if (data.status === 'connected') answeredRef.current = true;

        if (data.offer && !data.answer && !isCaller && pc.current && !pc.current.remoteDescription) {
          await pc.current.setRemoteDescription(new RTCSessionDescription(data.offer));
          const answer = await pc.current.createAnswer();
          await pc.current.setLocalDescription(answer);
          await updateDoc(callRef, {
            answer: JSON.parse(JSON.stringify(answer)),
            status: 'connected',
          });
        }

        if (data.answer && isCaller && pc.current && !pc.current.currentRemoteDescription) {
          await pc.current.setRemoteDescription(new RTCSessionDescription(data.answer));
        }
      });

      const iceRef = collection(db, `calls/${callId}/${isCaller ? 'answerCandidates' : 'offerCandidates'}`);
      remoteICEUnsubRef.current = onSnapshot(iceRef, snapshot => {
        snapshot.docChanges().forEach(async change => {
          if (change.type === 'added') {
            const data = change.doc.data();
            try {
              await pc.current?.addIceCandidate(new RTCIceCandidate(data));
              console.log('[ICE] Remote candidate added:', data);
            } catch (e) {
              console.warn('[ICE] Failed to add candidate:', e);
            }
          }
        });
      });

      if (isCaller && !callData.offer) {
        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
        await updateDoc(callRef, {
          offer: JSON.parse(JSON.stringify(offer)),
          status: 'ringing',
        });
      }
    };

    setupCall();

    timeoutRef.current = setTimeout(async () => {
      if (!answeredRef.current) {
        await updateDoc(doc(db, 'calls', callId), {
          status: 'rejected',
          autoRejected: true,
        });
        cleanupAndGoBack();
      }
    }, 30000);

    return () => {
      clearTimeout(timeoutRef.current!);
      cleanupAndGoBack();
    };
  }, [currentUserId]);

  const flipCamera = async () => {
    if (!pc.current?.getSenders) return;
    const newVal = !usingFrontCamera;
    setUsingFrontCamera(newVal);

    const newStream = await mediaDevices.getUserMedia({
      audio: true,
      video: {
        facingMode: newVal ? 'user' : 'environment',
        mandatory: { minWidth: 640, minHeight: 480, minFrameRate: 30 },
      },
    });

    const videoTrack = newStream.getVideoTracks()[0];
    pc.current.getSenders().forEach(sender => {
      if (sender.track?.kind === 'video') sender.replaceTrack(videoTrack);
    });

    localStream?.getTracks().forEach(track => track.stop());
    setLocalStream(newStream);
  };

  const hangUp = async () => {
    await updateDoc(doc(db, 'calls', callId), { status: 'ended' });
    cleanupAndGoBack();
  };

  const statusLabel = {
    calling: 'Calling...',
    ringing: 'Ringing...',
    connected: 'Connected',
    rejected: 'Rejected',
    ended: 'Call Ended',
  }[status] ?? 'Connecting...';

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      {remoteStream ? (
        <RTCView streamURL={remoteStream.toURL()} style={styles.remoteVideo} objectFit="cover" />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.connectingText}>Waiting for remote stream...</Text>
        </View>
      )}
      {localStream && (
        <RTCView streamURL={localStream.toURL()} style={styles.localVideo} objectFit="cover" />
      )}
      <View style={styles.userInfo}>
        {receiver?.avatar?.startsWith('http') ? (
          <Image source={{ uri: receiver.avatar }} style={styles.avatarImage} />
        ) : (
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{receiver?.name?.[0] || '?'}</Text>
          </View>
        )}
        <View>
          <Text style={styles.nameText}>{receiver?.name || 'Connecting...'}</Text>
          <Text style={styles.statusText}>{statusLabel}</Text>
        </View>
      </View>
      <View style={styles.controlsContainer}>
        <TouchableOpacity onPress={flipCamera} style={styles.flipButton}>
          <Ionicons name="camera-reverse" size={30} color="#fff" />
        </TouchableOpacity>
        <TouchableOpacity onPress={hangUp} style={styles.hangupButton}>
          <Ionicons name="call" size={30} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default VideoCallScreen;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.dark },
  remoteVideo: { flex: 1, backgroundColor: 'black' },
  localVideo: {
    width: 100,
    height: 150,
    position: 'absolute',
    bottom: theme.spacing.l,
    right: theme.spacing.l,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: theme.colors.white,
    zIndex: 10,
    overflow: 'hidden',
  },
  userInfo: {
    position: 'absolute',
    top: theme.spacing.l,
    left: theme.spacing.l,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 100,
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: theme.spacing.s,
    borderRadius: 12,
  },
  avatar: {
    backgroundColor: theme.colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.m,
  },
  avatarText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: theme.fontSizes.heading,
  },
  avatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: theme.spacing.m,
    borderWidth: 1.5,
    borderColor: theme.colors.white,
  },
  nameText: {
    color: theme.colors.white,
    fontSize: theme.fontSizes.body,
    fontWeight: '600',
  },
  statusText: {
    color: theme.colors.subtext,
    fontSize: theme.fontSizes.caption,
    marginTop: 2,
  },
  controlsContainer: {
    position: 'absolute',
    bottom: theme.spacing.xl,
    alignSelf: 'center',
    alignItems: 'center',
    flexDirection: 'row',
  },
  hangupButton: {
    backgroundColor: theme.colors.error,
    padding: theme.spacing.l,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  flipButton: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.l,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
    marginRight: 20,
  },
  fallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  connectingText: {
    color: theme.colors.subtext,
    fontSize: theme.fontSizes.heading,
  },
});
