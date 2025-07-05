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
  MediaStreamTrack,
} from 'react-native-webrtc';
import {
  getFirestore,
  doc,
  onSnapshot,
  updateDoc,
  getDoc,
  arrayUnion,
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

const configuration: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

const VideoCallScreen: React.FC<Props> = ({ route, navigation }) => {
  const { callId } = route.params;

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [status, setStatus] = useState<string>('calling');
  const [receiver, setReceiver] = useState<Receiver | null>(null);
  const [usingFrontCamera, setUsingFrontCamera] = useState<boolean>(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const pc = useRef<RTCPeerConnection | null>(null);
  const unsubRef = useRef<() => void>();
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const answeredRef = useRef<boolean>(false);
  const addedCandidates = useRef<Set<string>>(new Set());

  const cleanupAndGoBack = () => {
    try {
      pc.current?.close();
      pc.current = null;
      localStream
        ?.getTracks()
        .forEach((track: MediaStreamTrack) => track.stop());
    } catch (e) {
      console.warn('cleanup error:', e);
    }
    navigation.replace('ChatList');
  };

  useEffect(() => {
    const loadUser = async () => {
      const userStr = await AsyncStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user?._id) setCurrentUserId(user._id);
    };
    loadUser();
  }, []);

  useEffect(() => {
    if (!currentUserId) return;

    const setup = async () => {
      const callRef = doc(db, 'calls', callId);
      const snap = await getDoc(callRef);
      const data = snap.data();
      if (!data) return;

      const isCaller = currentUserId === data.callerId;

      setReceiver({
        _id: isCaller ? data.receiverId : data.callerId,
        name: isCaller ? data.receiverName : data.callerName,
        avatar: isCaller ? data.receiverAvatar : data.callerAvatar,
      });

      pc.current = new RTCPeerConnection(configuration);

      pc.current.onicecandidate = async event => {
        if (event.candidate) {
          const field = isCaller ? 'callerCandidates' : 'receiverCandidates';
          await updateDoc(callRef, {
            [field]: arrayUnion(event.candidate.toJSON()),
          });
        }
      };

      pc.current.oniceconnectionstatechange = () => {
        console.log('ICE connection state:', pc.current?.iceConnectionState);
      };

      pc.current.ontrack = event => {
        if (event.streams?.[0]) {
          setRemoteStream(event.streams[0]);
        }
      };

      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: {
          facingMode: usingFrontCamera ? 'user' : 'environment',
          mandatory: {
            minWidth: 640,
            minHeight: 480,
            minFrameRate: 30,
          },
        },
      });

      setLocalStream(stream);
      stream.getTracks().forEach(track => pc.current?.addTrack(track, stream));

      unsubRef.current = onSnapshot(callRef, async snap => {
        const upd = snap.data();
        if (!upd) return;

        setStatus(upd.status);

        if (upd.status === 'rejected' || upd.status === 'ended') {
          Alert.alert(upd.status === 'ended' ? 'Call Ended' : 'Call Rejected');
          cleanupAndGoBack();
        }

        if (upd.status === 'connected') {
          answeredRef.current = true;
        }

        if (
          upd.offer &&
          !upd.answer &&
          !isCaller &&
          pc.current &&
          !pc.current.remoteDescription
        ) {
          await pc.current.setRemoteDescription(
            new RTCSessionDescription(upd.offer),
          );
          const answer = await pc.current.createAnswer();
          await pc.current.setLocalDescription(answer);
          await updateDoc(callRef, {
            answer: JSON.parse(JSON.stringify(answer)),
            status: 'connected',
          });
        }

        if (
          upd.answer &&
          isCaller &&
          pc.current &&
          !pc.current.currentRemoteDescription
        ) {
          await pc.current.setRemoteDescription(
            new RTCSessionDescription(upd.answer),
          );
        }

        const candidates = isCaller
          ? upd.receiverCandidates
          : upd.callerCandidates;
        if (candidates) {
          candidates.forEach((c: any) => {
            const key = JSON.stringify(c);
            if (!addedCandidates.current.has(key)) {
              addedCandidates.current.add(key);
              pc.current
                ?.addIceCandidate(new RTCIceCandidate(c))
                .catch(err => console.warn('ICE error', err));
            }
          });
        }
      });

      if (isCaller && !data.offer) {
        const offer = await pc.current.createOffer();
        await pc.current.setLocalDescription(offer);
        await updateDoc(callRef, {
          offer: JSON.parse(JSON.stringify(offer)),
          status: 'ringing',
        });
      }
    };

    setup();

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
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      unsubRef.current?.();
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
        mandatory: {
          minWidth: 640,
          minHeight: 480,
          minFrameRate: 30,
        },
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

  const statusLabel =
    {
      ringing: 'Ringing...',
      connected: 'Connected',
      rejected: 'Rejected',
      ended: 'Call Ended',
    }[status] || 'Connecting...';

  return (
    <View style={styles.container}>
      <StatusBar hidden />
      {remoteStream ? (
        <RTCView
          key={remoteStream.id}
          streamURL={remoteStream.toURL()}
          style={styles.remoteVideo}
          objectFit="cover"
        />
      ) : (
        <View style={styles.fallback}>
          <Text style={styles.connectingText}>
            Waiting for remote stream...
          </Text>
        </View>
      )}

      {localStream && (
        <RTCView
          streamURL={localStream.toURL()}
          style={styles.localVideo}
          objectFit="cover"
        />
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
          <Text style={styles.nameText}>
            {receiver?.name || 'Connecting...'}
          </Text>
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
