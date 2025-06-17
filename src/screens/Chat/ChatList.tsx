import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Animated,
  Easing,
  Image,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from '../../utils/axiosInstance';
import moment from 'moment';
import theme from '../../shared/constant/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomDrawer from '../../shared/components/CustomDrawer';

const ChatList = ({ navigation }: any) => {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [drawerOpen, setDrawerOpen] = useState(false);

  const fetchChats = async () => {
    const user = await AsyncStorage.getItem('user');
    if (!user) return;
    const { _id } = JSON.parse(user);

    try {
      const { data } = await axios.get(`/chat/list/${_id}`);
      setChats(data.chatList);
    } catch (err) {
      console.error('Error fetching chat list', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChats();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <CustomDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        navigation={navigation}
      />

      <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.appName}>ChatFusion</Text>
          </View>

          <TouchableOpacity
            onPress={() => setDrawerOpen(true)}
            style={{ padding: 16 }}
          >
            <Ionicons name="menu-outline" size={26} color="black" />
          </TouchableOpacity>
        </View>

        <FlatList
          data={chats}
          renderItem={renderItem}
          keyExtractor={item => item._id}
          contentContainerStyle={{ paddingBottom: 80 }}
        />

        <TouchableOpacity
          style={styles.fab}
          onPress={() => navigation.navigate('Contacts')}
        >
          <Ionicons
            name="chatbubble-ellipses-outline"
            size={24}
            color="white"
          />
        </TouchableOpacity>
      </Animated.View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.background },
  container: {
    flex: 1,
    paddingHorizontal: theme.spacing.m,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: theme.spacing.m,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logo: {
    width: 32,
    height: 32,
    marginRight: 8,
  },
  appName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  chatItem: {
    flexDirection: 'row',
    padding: theme.spacing.m,
    marginBottom: theme.spacing.s,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  avatar: {
    backgroundColor: theme.colors.primary,
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    color: theme.colors.primary,
    fontWeight: '700',
    fontSize: 18,
  },
  textContainer: {
    flex: 1,
    paddingHorizontal: theme.spacing.s,
  },
  name: {
    fontSize: theme.fontSizes.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  message: {
    color: theme.colors.subtext,
    fontSize: theme.fontSizes.caption,
    marginTop: 2,
  },
  rightContainer: {
    alignItems: 'flex-end',
  },
  time: {
    fontSize: 12,
    color: theme.colors.subtext,
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: theme.colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: theme.colors.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.colors.background,
  },
});

export default ChatList;
