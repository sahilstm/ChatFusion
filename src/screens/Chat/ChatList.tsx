import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from '../../utils/axiosInstance';
import moment from 'moment';

const ChatList = ({ navigation }: any) => {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchChats = async () => {
    const user = await AsyncStorage.getItem('user');
    if (!user) return;
    const { _id } = JSON.parse(user);

    try {
      const { data } = await axios.get(`/chat/list/${_id}`);
      setChats(data.chatList);
      console.log(data.chatList);
    } catch (err) {
      console.error('Error fetching chat list', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();
  }, []);

  const renderItem = ({ item }: any) => (
    <TouchableOpacity
      style={styles.chatItem}
      onPress={() =>
        navigation.navigate('Chat', {
          user: { _id: item.participantId, name: item.name, phone: item.phone },
        })
      }
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{item.name?.[0]}</Text>
      </View>

      <View style={styles.textContainer}>
        <Text style={styles.name}>{item.name}</Text>
        <Text numberOfLines={1} style={styles.message}>
          {item.lastMessage}
        </Text>
      </View>

      <View style={styles.rightContainer}>
        <Text style={styles.time}>
          {item.timestamp ? moment(item.timestamp).fromNow() : ''}
        </Text>
      </View>
    </TouchableOpacity>
  );

  if (loading)
    return (
      <ActivityIndicator style={{ flex: 1 }} size="large" color="#007bff" />
    );

  return (
    <View style={styles.container}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', margin: 16 }}>
        Chat List
      </Text>
      <FlatList
        data={chats}
        renderItem={renderItem}
        keyExtractor={item => item._id}
      />
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Contacts')}
      >
        <Text>New</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  chatItem: {
    flexDirection: 'row',
    padding: 16,
    borderBottomWidth: 0.5,
    borderColor: '#ccc',
    alignItems: 'center',
  },
  avatar: {
    backgroundColor: '#007bff',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  textContainer: { flex: 1, paddingHorizontal: 12 },
  name: { fontSize: 16, fontWeight: 'bold' },
  message: { color: '#555', marginTop: 2 },
  rightContainer: { alignItems: 'flex-end' },
  time: { fontSize: 12, color: '#666' },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: '#007bff',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
  },
});

export default ChatList;
