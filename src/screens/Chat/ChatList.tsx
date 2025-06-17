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
  PermissionsAndroid,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from '../../utils/axiosInstance';
import moment from 'moment';
import theme from '../../shared/constant/theme';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { SafeAreaView } from 'react-native-safe-area-context';
import CustomDrawer from '../../shared/components/CustomDrawer';
import Contacts from 'react-native-contacts';

const ChatList = ({ navigation }: any) => {
  const [chats, setChats] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const fadeAnim = useState(new Animated.Value(0))[0];
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [filter, setFilter] = useState('All');
  const [counts, setCounts] = useState({
    unread: 0,
    favorites: 0,
    groups: 0,
  });
  const [contactMap, setContactMap] = useState<{ [phone: string]: string }>({});

  const fetchChats = async () => {
    const user = await AsyncStorage.getItem('user');
    if (!user) return;
    const { _id } = JSON.parse(user);

    try {
      const { data } = await axios.get(`/chat/list/${_id}`);
      setChats(data.chatList);

      const unread = data.chatList.filter(
        (chat: { read: any }) => !chat.read,
      ).length;
      const favorites = data.chatList.filter(
        (chat: { favorite: any }) => chat.favorite,
      ).length;
      const groups = data.chatList.filter(
        (chat: { isGroup: any }) => chat.isGroup,
      ).length;

      setCounts({ unread, favorites, groups });
    } catch (err) {
      console.error('Error fetching chat list', err);
    } finally {
      setLoading(false);
    }
  };
  const normalizePhoneNumber = (number: string) => {
    return number.replace(/[^\d]/g, '').slice(-10);
  };

  const loadContacts = async () => {
    try {
      if (Platform.OS === 'android') {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) return;
      }

      const contacts = await Contacts.getAll();
      const map: { [cleanedNumber: string]: string } = {};

      contacts.forEach(contact => {
        contact.phoneNumbers.forEach(pn => {
          const cleaned = normalizePhoneNumber(pn.number);
          if (cleaned) {
            map[cleaned] = contact.displayName || contact.givenName || '';
          }
        });
      });

      setContactMap(map);
    } catch (error) {
      console.error('Failed to load contacts', error);
    }
  };

  useEffect(() => {
    loadContacts();
    fetchChats();

    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      easing: Easing.out(Easing.ease),
      useNativeDriver: true,
    }).start();
  }, []);

  const filters = [
    { label: 'All', key: 'All' },
    { label: 'Unread', key: 'Unread', count: counts.unread },
    { label: 'Favorites', key: 'Favorites', count: counts.favorites },
    { label: 'Groups', key: 'Groups', count: counts.groups },
    { label: '+', key: 'Add' },
  ];

  const filteredChats = chats.filter(chat => {
    if (filter === 'All') return true;
    if (filter === 'Unread') return !chat.read;
    if (filter === 'Favorites') return chat.favorite;
    if (filter === 'Groups') return chat.isGroup;
    return true;
  });

  const renderItem = ({ item }: any) => {
    const cleanedPhone = normalizePhoneNumber(item.phone);
    const displayName = contactMap[cleanedPhone] || item.name || item.phone;

    return (
      <TouchableOpacity
        style={styles.chatItem}
        onPress={() =>
          navigation.navigate('Chat', {
            user: {
              _id: item.participantId,
              name: displayName,
              phone: item.phone,
            },
          })
        }
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{displayName?.[0]}</Text>
        </View>

        <View style={styles.textContainer}>
          <Text style={styles.name}>{displayName}</Text>
          <Text numberOfLines={1} style={styles.message}>
            {item.lastMessage}
          </Text>
        </View>

        <View style={styles.rightContainer}>
          <Text style={styles.time}>
            {item.timestamp ? moment(item.timestamp).fromNow() : ''}
          </Text>
          {!item.read && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadText}>1</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

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

        <View style={styles.filterBar}>
          {filters.map(({ label, key, count }) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterButton,
                filter === key && styles.activeFilterButton,
              ]}
              onPress={() => setFilter(key)}
            >
              <Text
                style={[
                  styles.filterText,
                  filter === key && styles.activeFilterText,
                ]}
              >
                {label}
                {typeof count === 'number' && count > 0 ? ` ${count}` : ''}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <FlatList
          data={filteredChats}
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
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
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
  filterBar: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingVertical: 10,
    marginVertical: 6,
  },
  filterButton: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    marginRight: 8,
    marginBottom: 8,
  },
  activeFilterButton: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: theme.fontSizes.caption,
    color: theme.colors.text,
  },
  activeFilterText: {
    color: '#fff',
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
    color: theme.colors.white,
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
  unreadBadge: {
    backgroundColor: theme.colors.primary,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginTop: 4,
    alignSelf: 'flex-end',
  },
  unreadText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
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
