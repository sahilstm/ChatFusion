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
  Image,
  Alert,
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
import CustomBottomSheet from '../../shared/components/CustomBottomSheet';

type Props = NativeStackScreenProps<any, 'Chat'>;

interface Message {
  id?: string;
  senderId: string;
  receiverId: string;
  text?: string;
  imageUrl?: string;
  caption?: string;
  timestamp: any;
  seen?: boolean;
  delivered?: boolean;
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
  const [isReceiverTyping, setIsReceiverTyping] = useState(false);
  const [showSheet, setShowSheet] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(
    null,
  );
  const animRefs = useRef<Animated.Value[]>([]);
  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    const loadUser = async () => {
      const user = await AsyncStorage.getItem('user');
      if (user) setCurrentUser(JSON.parse(user));
    };
    loadUser();
  }, []);

  useEffect(() => {
    const receiverStatusRef = doc(db, 'status', receiver._id);
    const unsub = onSnapshot(receiverStatusRef, docSnap => {
      const data = docSnap.data();
      setIsOnline(data?.isOnline || false);
      if (data?.lastSeen) setLastSeen(data.lastSeen);
    });
    return () => unsub();
  }, [receiver._id]);

  useEffect(() => {
    if (!currentUser?._id) return;
    const userStatusRef = doc(db, 'status', currentUser._id);

    const setOnline = async () => {
      await setDoc(
        userStatusRef,
        {
          isOnline: true,
          lastSeen: serverTimestamp(),
        },
        { merge: true },
      );
    };

    const setOffline = async () => {
      await setDoc(
        userStatusRef,
        {
          isOnline: false,
          lastSeen: serverTimestamp(),
        },
        { merge: true },
      );
    };

    setOnline();
    const sub = AppState.addEventListener('change', state => {
      state === 'active' ? setOnline() : setOffline();
    });

    return () => {
      setOffline();
      sub.remove();
    };
  }, [currentUser]);

  useEffect(() => {
    if (!currentUser || !receiver) return;

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
    if (!currentUser?._id || !receiver._id) return;

    const typingDoc = doc(
      db,
      'typing',
      `${receiver._id}_to_${currentUser._id}`,
    );
    const unsubscribe = onSnapshot(typingDoc, docSnap => {
      const data = docSnap.data();
      if (data?.userId === receiver._id && data?.isTyping) {
        const lastTyped = data.timestamp?.toDate?.();
        const isRecent = moment().diff(lastTyped, 'seconds') <= 5;
        setIsReceiverTyping(isRecent);
      } else {
        setIsReceiverTyping(false);
      }
    });

    return () => unsubscribe();
  }, [currentUser, receiver]);

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
      await addDoc(chatRef, msg).then(async docRef => {
        await updateDoc(docRef, { delivered: true });
      });

      const fcmToken = await AsyncStorage.getItem(`fcm_${receiver._id}`);
      await axios.post('/chat/send', {
        senderId: currentUser._id,
        receiverId: receiver._id,
        message: msg.text,
        fcmToken,
      });

      const typingDoc = doc(
        db,
        'typing',
        `${currentUser._id}_to_${receiver._id}`,
      );
      await setDoc(typingDoc, { isTyping: false }, { merge: true });
    } catch (err) {
      console.error('Failed to send message', err);
    }

    setInput('');
  };

  const handleTyping = async (text: string) => {
    setInput(text);
    if (!currentUser || !receiver) return;

    const typingDoc = doc(
      db,
      'typing',
      `${currentUser._id}_to_${receiver._id}`,
    );

    await setDoc(
      typingDoc,
      {
        isTyping: !!text.trim(),
        userId: currentUser._id,
        timestamp: serverTimestamp(),
      },
      { merge: true },
    );

    if (typingTimeout) clearTimeout(typingTimeout);

    const timeout = setTimeout(() => {
      setDoc(
        typingDoc,
        {
          isTyping: false,
          userId: currentUser._id,
        },
        { merge: true },
      );
    }, 5000);

    setTypingTimeout(timeout);
  };

  const renderItem = ({ item, index }: { item: Message; index: number }) => {
    const isMe = item.senderId === currentUser?._id;
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
        {item.imageUrl && (
          <Image
            source={{ uri: item.imageUrl }}
            style={styles.image}
            resizeMode="cover"
          />
        )}
        {item.caption && (
          <Text
            style={[
              styles.msgText,
              isMe ? styles.msgTextRight : styles.msgTextLeft,
            ]}
          >
            {item.caption}
          </Text>
        )}
        {item.text && (
          <Text
            style={[
              styles.msgText,
              isMe ? styles.msgTextRight : styles.msgTextLeft,
            ]}
          >
            {item.text}
          </Text>
        )}

        {item.timestamp?.toDate && (
          <Text style={styles.msgTime}>
            {moment(item.timestamp.toDate()).format('h:mm A')}
            {isMe && (
              <Ionicons
                name={
                  item.seen
                    ? 'checkmark-done'
                    : item.delivered
                    ? 'checkmark-done-outline'
                    : 'checkmark-outline'
                }
                size={16}
                color={item.seen ? theme.colors.white : theme.colors.subtext}
              />
            )}
          </Text>
        )}
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
                {isReceiverTyping
                  ? 'typing...'
                  : isOnline
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
              onPress={async () => {
                if (!currentUser || !receiver) return;
                const callId = `${currentUser._id}_${receiver._id}`;
                const callRef = doc(db, 'calls', callId);

                await setDoc(callRef, {
                  callerId: currentUser._id,
                  callerName: currentUser.name,
                  callerAvatar: currentUser.avatar || '',
                  receiverId: receiver._id,
                  receiverName: receiver.name,
                  receiverAvatar: receiver.avatar || '',
                  status: 'ringing',
                  type: 'video',
                  timestamp: serverTimestamp(),
                });
                
                await setDoc(doc(db, 'calls', callId, 'offerCandidates', callId), {
                  candidates: [],
                });
                await setDoc(doc(db, 'calls', callId, 'answerCandidates', callId), {
                  candidates: [],
                });
                
                navigation.navigate('VideoCallScreen', { callId });
              }}
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
          <TouchableOpacity onPress={() => setShowSheet(true)}>
            <Ionicons
              name="apps"
              size={theme.fontSizes.title}
              color={theme.colors.primary}
            />
          </TouchableOpacity>

          <TextInput
            value={input}
            onChangeText={handleTyping}
            placeholder="Type a message"
            placeholderTextColor={theme.colors.subtext}
            style={styles.input}
          />
          <TouchableOpacity onPress={sendMessage} style={styles.sendButton}>
            <Text style={styles.sendText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <CustomBottomSheet
        visible={showSheet}
        onClose={() => setShowSheet(false)}
      />
    </SafeAreaView>
  );
};

export default ChatScreen;

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.card },
  container: { flex: 1, backgroundColor: theme.colors.background },
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
  iconLeft: { marginRight: 12 },
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
    backgroundColor: theme.colors.primary,
  },
  msgText: {
    fontSize: theme.fontSizes.body,
  },
  msgTextLeft: {
    color: theme.colors.primary,
  },
  msgTextRight: {
    color: theme.colors.white,
  },

  msgTime: {
    fontSize: theme.fontSizes.caption,
    color: theme.colors.subtext,
    marginTop: 4,
    textAlign: 'right',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.s,
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
