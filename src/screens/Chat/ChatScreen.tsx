import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  FlatList,
  TextInput,
  Text,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  Animated,
  AppState,
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
  doc,
  updateDoc,
  setDoc,
} from 'firebase/firestore';
import { getApps, initializeApp } from 'firebase/app';
import { firebaseConfig } from '../../config/firebase-config';
import axios from '../../utils/axiosInstance';
import theme from '../../shared/constant/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import Ionicons from 'react-native-vector-icons/Ionicons';

type Props = NativeStackScreenProps<any, 'Chat'>;

interface Message {
  id?: string;
  senderId: string;
  receiverId: string;
  text: string;
  timestamp: any;
  seen?: boolean;
}

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const ChatScreen: React.FC<Props> = ({ route, navigation }) => {
  const { user: receiver } = route.params;
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [lastSeen, setLastSeen] = useState<any>(null);
  const animRefs = useRef<Animated.Value[]>([]);
  const flatListRef = useRef<FlatList>(null);

  console.log(lastSeen);
  console.log('Current user', currentUser);
  console.log('Receiver ID', receiver._id);

  useEffect(() => {
    const loadUser = async () => {
      const user = await AsyncStorage.getItem('user');
      if (user) {
        const parsed = JSON.parse(user);
        setCurrentUser(parsed);
      }
    };
    loadUser();
  }, []);

  useEffect(() => {
    const receiverStatusRef = doc(db, 'status', receiver._id);
    const unsub = onSnapshot(receiverStatusRef, docSnap => {
      const data = docSnap.data();
      if (data?.isOnline) {
        setIsOnline(true);
      } else {
        setIsOnline(false);
        if (data?.lastSeen) setLastSeen(data.lastSeen);
      }
    });
    return () => unsub();
  }, [receiver._id]);

  useEffect(() => {
    if (!currentUser?._id) return;
    const userStatusRef = doc(db, 'status', currentUser._id);

    const setOnline = async () => {
      try {
        await setDoc(
          doc(db, 'status', currentUser._id),
          {
            isOnline: true,
            lastSeen: serverTimestamp(),
          },
          { merge: true },
        );
        console.log('status set');
      } catch (err) {
        console.error('Failed set online status', err);
      }
    };

    const setOffline = async () => {
      try {
        await setDoc(
          doc(db, 'status', currentUser._id),
          {
            isOnline: false,
            lastSeen: serverTimestamp(),
          },
          { merge: true },
        );
        console.log('Offline status');
      } catch (err) {
        console.error('Failed set offline status', err);
      }
    };

    setOnline();

    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') {
        setOnline();
      } else {
        setOffline();
      }
    });

    return () => {
      setOffline();
      sub.remove();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser) return;

    const chatId = [currentUser._id, receiver._id].sort().join('_');
    const chatRef = collection(db, 'chats', chatId, 'messages');
    const q = query(chatRef, orderBy('timestamp', 'asc'));

    const unsub = onSnapshot(q, async snap => {
      const msgs = snap.docs.map(docSnap => ({
        ...(docSnap.data() as Message),
        id: docSnap.id,
      }));

      const unseen = msgs.filter(
        msg => msg.receiverId === currentUser._id && !msg.seen,
      );

      for (const msg of unseen) {
        const msgRef = doc(db, 'chats', chatId, 'messages', msg.id!);
        await updateDoc(msgRef, { seen: true });
      }

      animRefs.current = msgs.map(() => new Animated.Value(0));
      setMessages(msgs);
    });

    return () => unsub();
  }, [currentUser]);

  useEffect(() => {
    messages.forEach((_, i) => {
      Animated.timing(animRefs.current[i], {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || !currentUser) return;

    const chatId = [currentUser._id, receiver._id].sort().join('_');
    const msg: Message = {
      senderId: currentUser._id,
      receiverId: receiver._id,
      text: input,
      timestamp: serverTimestamp(),
      seen: false,
    };

    try {
      const chatRef = collection(db, 'chats', chatId, 'messages');
      await addDoc(chatRef, msg);

      const fcmToken = await AsyncStorage.getItem(`fcm_${receiver._id}`);
      await axios.post('/chat/send', {
        senderId: currentUser._id,
        receiverId: receiver._id,
        message: msg.text,
        fcmToken,
      });
    } catch (err: any) {
      console.error('Failed to send message', err.message);
    }

    setInput('');
  };

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === currentUser?._id;
    const isLast = isMe && index === messages.length - 1;

    const translateY =
      animRefs.current[index]?.interpolate({
        inputRange: [0, 1],
        outputRange: [20, 0],
      }) || 0;

    return (
      <Animated.View
        style={[
          styles.msgContainer,
          isMe ? styles.msgRight : styles.msgLeft,
          { transform: [{ translateY }] },
          { opacity: animRefs.current[index] || 1 },
        ]}
      >
        <Text style={styles.msgText}>{item.text}</Text>
        <Text style={styles.msgTime}>
          {item.timestamp?.toDate &&
            moment(item.timestamp.toDate()).format('h:mm A')}
          {isLast && item.seen && '  ✓ Seen'}
        </Text>
      </Animated.View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.iconLeft}
          >
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{receiver.name?.[0]}</Text>
            </View>
            <View>
              <Text style={styles.name}>{receiver.name}</Text>
              <Text style={styles.status}>
                {isOnline
                  ? 'Online'
                  : lastSeen
                  ? `Last seen at ${moment(lastSeen.toDate()).format('h:mm A')}`
                  : 'Last seen recently'}
              </Text>
            </View>
          </View>

          <View style={styles.iconRightContainer}>
            <TouchableOpacity onPress={() => console.log('Audio call')}>
              <Ionicons
                name="call-outline"
                size={22}
                color={theme.colors.text}
              />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => console.log('Video call')}
              style={{ marginLeft: 16 }}
            >
              <Ionicons
                name="videocam-outline"
                size={22}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          </View>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item, i) => item.id || i.toString()}
          renderItem={renderItem}
          contentContainerStyle={styles.msgList}
          showsVerticalScrollIndicator={false}
          onContentSizeChange={() =>
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        />

        <View style={styles.inputBar}>
          <TextInput
            value={input}
            onChangeText={setInput}
            placeholder="Type a message"
            placeholderTextColor={theme.colors.subtext}
            style={styles.input}
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.card,
  },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.m,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
  iconLeft: {
    marginRight: 12,
  },
  iconRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 'auto',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatarText: {
    color: theme.colors.white,
    fontWeight: 'bold',
    fontSize: theme.fontSizes.heading,
  },
  name: {
    fontSize: theme.fontSizes.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  status: {
    fontSize: theme.fontSizes.caption,
    color: theme.colors.subtext,
  },
  msgList: {
    padding: theme.spacing.m,
  },
  msgContainer: {
    maxWidth: '70%',
    padding: 10,
    borderRadius: 8,
    marginVertical: 4,
  },
  msgLeft: {
    alignSelf: 'flex-start',
    backgroundColor: theme.colors.card,
  },
  msgRight: {
    alignSelf: 'flex-end',
    backgroundColor: theme.colors.success,
  },
  msgText: {
    fontSize: theme.fontSizes.body,
    color: theme.colors.text,
  },
  msgTime: {
    fontSize: theme.fontSizes.caption,
    color: theme.colors.subtext,
    marginTop: 4,
    textAlign: 'right',
  },
  inputBar: {
    flexDirection: 'row',
    padding: theme.spacing.s,
    borderTopWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.card,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    paddingHorizontal: theme.spacing.sm,
    marginRight: theme.spacing.s,
    backgroundColor: theme.colors.white,
    color: theme.colors.text,
  },
  sendButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendText: {
    color: theme.colors.white,
    fontWeight: '600',
  },
});

export default ChatScreen;
