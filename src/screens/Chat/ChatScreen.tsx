import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  TextInput,
  Button,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import moment from 'moment';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

import {
  getFirestore,
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';

import { getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '../../config/firebase-config';
import axios from '../../utils/axiosInstance';

type Props = NativeStackScreenProps<any, 'Chat'>;

interface Message {
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: any;
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const ChatScreen: React.FC<Props> = ({ route }) => {
  const { user: receiver } = route.params;
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');

  useEffect(() => {
    AsyncStorage.getItem('user').then(u => {
      if (u) setCurrentUser(JSON.parse(u));
    });
  }, []);

  useEffect(() => {
    if (!currentUser) return;

    const chatId = [currentUser._id, receiver._id].sort().join('_');
    const chatRef = collection(db, 'chats', chatId, 'messages');
    const q = query(chatRef, orderBy('timestamp', 'asc'));

    const unsub = onSnapshot(q, snap => {
      const msgs = snap.docs.map(d => d.data() as Message);
      setMessages(msgs);
    });

    return () => unsub();
  }, [currentUser]);

  const sendMessage = async () => {
    console.log('Send button clicked');

    if (!input.trim()) {
      console.log('Input is empty');
      return;
    }

    if (!currentUser) {
      console.log('Current user not set');
      return;
    }

    const chatId = [currentUser._id, receiver._id].sort().join('_');

    const msg: Message = {
      senderId: currentUser._id,
      receiverId: receiver._id,
      text: input,
      timestamp: serverTimestamp(),
    };

    console.log('Prepared message', msg);
    console.log('chatId', chatId);

    try {
      const chatRef = collection(db, 'chats', chatId, 'messages');
      const docRef = await addDoc(chatRef, msg);
      console.log('Message sent to Firestore with ID', docRef.id);

      const fcmToken = await AsyncStorage.getItem(`fcm_${receiver._id}`);
      console.log('Receiver FCM token', fcmToken);

      const response = await axios.post('/chat/send', {
        senderId: currentUser._id,
        receiverId: receiver._id,
        message: msg.text,
        fcmToken,
      });

      console.log('Notification sent. Server response', response.data);
    } catch (err: any) {
      console.error('Failed to send message', err.message);
    }

    setInput('');
  };

  const renderItem = ({ item }: { item: Message }) => {
    const isMe = item.senderId === currentUser?._id;
    return (
      <View
        style={[styles.msgContainer, isMe ? styles.msgRight : styles.msgLeft]}
      >
        <Text style={styles.msgText}>{item.text}</Text>
        {item.timestamp?.toDate && (
          <Text style={styles.msgTime}>
            {moment(item.timestamp.toDate()).format('h:mm A')}
          </Text>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <FlatList
        data={messages}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderItem}
        contentContainerStyle={styles.msgList}
      />
      <View style={styles.inputBar}>
        <TextInput
          value={input}
          onChangeText={setInput}
          placeholder="Type a message"
          style={styles.input}
        />
        <Button title="Send" onPress={sendMessage} />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1 },
  msgList: { padding: 12 },
  msgContainer: {
    maxWidth: '70%',
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
  },
  msgLeft: { alignSelf: 'flex-start', backgroundColor: '#FFF' },
  msgRight: { alignSelf: 'flex-end', backgroundColor: '#DCF8C5' },
  msgText: { fontSize: 16 },
  msgTime: {
    fontSize: 10,
    color: '#555',
    marginTop: 4,
    textAlign: 'right',
  },
  inputBar: {
    flexDirection: 'row',
    padding: 8,
    borderTopWidth: 1,
    borderColor: '#ddd',
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 20,
    paddingHorizontal: 12,
    marginRight: 8,
  },
});

export default ChatScreen;
