import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Clipboard from '@react-native-clipboard/clipboard';
import {
  mediaDevices,
  RTCPeerConnection,
  RTCIceCandidate,
  RTCSessionDescription,
  RTCView,
  MediaStream,
} from 'react-native-webrtc';
import theme from '../constant/theme';

const configuration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    {
      urls: 'turn:relay1.expressturn.com:3480',
      username: '000000002067070389',
      credential: 'uRae3avC/FjGKgGHPMdVD1PgpO4=',
    },
  ],
};

const VideoCallScreen = () => {
  const pcRef = useRef<RTCPeerConnection | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [sdp, setSdp] = useState('');
  const [remoteSdp, setRemoteSdp] = useState('');
  const [localCandidates, setLocalCandidates] = useState<string[]>([]);
  const [remoteCandidates, setRemoteCandidates] = useState('');

  const handleCopy = (label: string, content: string) => {
    Clipboard.setString(content);
    Alert.alert('Copied', `${label} copied to clipboard.`);
  };

  const setupConnection = () => {
    const pc = pcRef.current;
    if (!pc) return;

    console.log('[INIT] Setting up PeerConnection event handlers');

    pc.onicecandidate = event => {
      if (event.candidate) {
        const candidateStr = JSON.stringify(event.candidate);
        console.log('[ICE] Local candidate:', candidateStr);
        setLocalCandidates(prev =>
          prev.includes(candidateStr) ? prev : [...prev, candidateStr],
        );
      } else {
        console.log('[ICE] Candidate gathering complete.');
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log('[ICE] Gathering State:', pc.iceGatheringState);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[ICE] Connection State:', pc.iceConnectionState);
    };

    pc.onsignalingstatechange = () => {
      console.log('[SIGNALING] State:', pc.signalingState);
    };

    pc.onaddstream = event => {
      console.log('[STREAM] Remote stream received via onaddstream');
      setRemoteStream(event.stream);
    };
  };

  const startCamera = async () => {
    try {
      console.log('[CAMERA] Requesting media...');
      const stream = await mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      console.log('[CAMERA] Media stream received');
      setLocalStream(stream);

      if (!pcRef.current) {
        console.log('[PEER] Creating PeerConnection');
        pcRef.current = new RTCPeerConnection(configuration);
        setupConnection();
      }

      if (pcRef.current && stream) {
        console.log('[PEER] Adding stream to connection');
        pcRef.current.addStream(stream);
      }
    } catch (err) {
      console.error('[CAMERA] Error accessing media:', err);
    }
  };

  const createOffer = async () => {
    try {
      if (!pcRef.current) return;
      console.log('[OFFER] Creating offer...');
      const offer = await pcRef.current.createOffer();
      await pcRef.current.setLocalDescription(offer);
      console.log('[OFFER] Local description set');
      setSdp(JSON.stringify(offer));
    } catch (err) {
      console.error('[OFFER] Error creating offer:', err);
    }
  };

  const createAnswer = async () => {
    try {
      if (!pcRef.current || !pcRef.current.remoteDescription) {
        Alert.alert('Remote SDP not set');
        return;
      }
      console.log('[ANSWER] Creating answer...');
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      console.log('[ANSWER] Local description set');
      setSdp(JSON.stringify(answer));
    } catch (err) {
      console.error('[ANSWER] Error creating answer:', err);
    }
  };

  const setRemoteDescription = async () => {
    try {
      const desc = new RTCSessionDescription(JSON.parse(remoteSdp));
      console.log('[REMOTE SDP] Parsed:', desc);

      if (
        pcRef.current?.signalingState === 'have-local-offer' &&
        desc.type === 'offer'
      ) {
        Alert.alert('Already created an offer. Cannot set another offer.');
        return;
      }

      await pcRef.current?.setRemoteDescription(desc);
      console.log('[REMOTE SDP] Set successfully');
    } catch (err) {
      console.error('[REMOTE SDP] Error:', err);
      Alert.alert('Invalid or duplicate SDP');
    }
  };

  const addRemoteCandidates = async () => {
    if (!pcRef.current?.remoteDescription) {
      Alert.alert('Remote SDP must be set before adding ICE candidates');
      return;
    }

    console.log('[REMOTE ICE] Adding candidates...');
    const lines = remoteCandidates
      .split('\n')
      .map(line => line.trim())
      .filter(Boolean);

    for (const line of lines) {
      try {
        const candidate = new RTCIceCandidate(JSON.parse(line));
        await pcRef.current.addIceCandidate(candidate);
        console.log('[REMOTE ICE] Candidate added:', candidate.candidate);
      } catch (err) {
        console.error('[REMOTE ICE] Error adding candidate:', err);
      }
    }
  };

  const resetPeerConnection = () => {
    console.log('[RESET] Resetting PeerConnection');
    pcRef.current?.close();
    pcRef.current = new RTCPeerConnection(configuration);
    setupConnection();

    setSdp('');
    setRemoteSdp('');
    setLocalCandidates([]);
    setRemoteCandidates('');
    setLocalStream(null);
    setRemoteStream(null);
  };

  useEffect(() => {
    console.log('[INIT] Initializing PeerConnection');
    pcRef.current = new RTCPeerConnection(configuration);
    setupConnection();

    return () => {
      console.log('[CLEANUP] Closing PeerConnection');
      pcRef.current?.close();
      pcRef.current = null;
      localStream?.getTracks().forEach(track => {
        console.log('[CLEANUP] Stopping track:', track.kind);
        track.stop();
      });
    };
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <ScrollView style={styles.container}>
        <Text style={styles.heading}>
          React Native WebRTC - Manual Signaling
        </Text>

        <View style={styles.section}>
          <Text style={styles.subHeading}>Local Video</Text>
          {localStream ? (
            <RTCView
              streamURL={localStream.toURL()}
              style={styles.localVideo}
              objectFit="cover"
            />
          ) : (
            <Text style={styles.placeholder}>Camera not started</Text>
          )}
        </View>

        <View style={styles.section}>
          <Text style={styles.subHeading}>Remote Video</Text>
          {remoteStream ? (
            <RTCView
              streamURL={remoteStream.toURL()}
              style={styles.remoteVideo}
              objectFit="cover"
            />
          ) : (
            <Text style={styles.placeholder}>No remote stream</Text>
          )}
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity onPress={startCamera} style={styles.button}>
            <Text style={styles.buttonText}>Start Camera</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={createOffer} style={styles.button}>
            <Text style={styles.buttonText}>Create Offer</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={createAnswer} style={styles.button}>
            <Text style={styles.buttonText}>Create Answer</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            onPress={setRemoteDescription}
            style={styles.button}
          >
            <Text style={styles.buttonText}>Set Remote SDP</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={addRemoteCandidates} style={styles.button}>
            <Text style={styles.buttonText}>Add Remote ICE</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={resetPeerConnection}
            style={styles.buttonReset}
          >
            <Text style={styles.buttonText}>Reset</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.subHeading}>Local SDP</Text>
          <TextInput style={styles.textArea} multiline value={sdp} />
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => handleCopy('Local SDP', sdp)}
          >
            <Text style={styles.copyButtonText}>Copy Local SDP</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.subHeading}>Remote SDP</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={remoteSdp}
            onChangeText={setRemoteSdp}
          />
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() => handleCopy('Remote SDP', remoteSdp)}
          >
            <Text style={styles.copyButtonText}>Copy Remote SDP</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.subHeading}>Local ICE Candidates</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={localCandidates.join('\n')}
          />
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() =>
              handleCopy('Local ICE Candidates', localCandidates.join('\n'))
            }
          >
            <Text style={styles.copyButtonText}>Copy Local ICE</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.subHeading}>Remote ICE Candidates</Text>
          <TextInput
            style={styles.textArea}
            multiline
            value={remoteCandidates}
            onChangeText={setRemoteCandidates}
          />
          <TouchableOpacity
            style={styles.copyButton}
            onPress={() =>
              handleCopy('Remote ICE Candidates', remoteCandidates)
            }
          >
            <Text style={styles.copyButtonText}>Copy Remote ICE</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.dark,
  },
  container: {
    flex: 1,
    padding: theme.spacing.m,
  },
  heading: {
    fontSize: theme.fontSizes.title,
    fontWeight: 'bold',
    color: theme.colors.white,
    marginBottom: theme.spacing.m,
    textAlign: 'center',
  },
  subHeading: {
    fontSize: theme.fontSizes.heading,
    fontWeight: '600',
    color: theme.colors.light,
    marginBottom: theme.spacing.s,
  },
  section: {
    backgroundColor: '#1c1c1e',
    padding: theme.spacing.s,
    borderRadius: 10,
    marginBottom: theme.spacing.m,
  },
  placeholder: {
    height: 200,
    backgroundColor: '#333',
    color: theme.colors.subtext,
    textAlign: 'center',
    lineHeight: 200,
  },
  localVideo: {
    width: '100%',
    height: 200,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  remoteVideo: {
    width: '100%',
    height: 200,
    backgroundColor: '#333',
    borderRadius: 8,
  },
  buttonRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    gap: 10,
    marginBottom: theme.spacing.s,
  },
  button: {
    flex: 1,
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.s,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  buttonReset: {
    flex: 1,
    backgroundColor: theme.colors.error,
    padding: theme.spacing.s,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  buttonText: {
    color: theme.colors.white,
    textAlign: 'center',
    fontWeight: '600',
  },
  textArea: {
    backgroundColor: '#2a2a2a',
    color: theme.colors.white,
    borderRadius: 8,
    padding: 10,
    minHeight: 80,
    maxHeight: 200,
    textAlignVertical: 'top',
  },
  copyButton: {
    marginTop: theme.spacing.s,
    backgroundColor: theme.colors.success,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  copyButtonText: {
    color: theme.colors.white,
    fontWeight: '600',
    fontSize: theme.fontSizes.small,
  },
});

export default VideoCallScreen;
