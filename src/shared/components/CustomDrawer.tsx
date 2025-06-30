import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableWithoutFeedback,
  Image,
  Pressable,
  Platform,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../constant/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import RNRestart from 'react-native-restart';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = width * 0.75;

const CustomDrawer = ({ isOpen, onClose, navigation }: any) => {
  const translateX = useRef(new Animated.Value(-DRAWER_WIDTH)).current;

  const [user, setUser] = useState({
    name: '',
    about: '',
    image: '',
    phone:''
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const userStr = await AsyncStorage.getItem('user');
        if (userStr) {
          const parsed = JSON.parse(userStr);
          setUser({
            name: parsed.name || 'Guest',
            about: parsed.about || 'Available',
            image: parsed.image || '',
            phone: parsed.phone || '',
          });
        }
      } catch (e) {
        console.error('Failed to load user from storage:', e);
      }
    };

    fetchUser();
  }, []);

  useEffect(() => {
    Animated.timing(translateX, {
      toValue: isOpen ? 0 : -DRAWER_WIDTH,
      duration: 250,
      useNativeDriver: true,
    }).start();
  }, [isOpen]);

  const navigateTo = (screen: string) => {
    onClose();
    navigation.navigate(screen);
  };

  const handleLogout = async () => {
    try {
      await AsyncStorage.clear();
      RNRestart.restart();
    } catch (e) {
      console.error('Logout error:', e);
    }
  };

  const menuItems = useMemo(
    () => [
      { label: 'New group', icon: 'people-outline', screen: 'NewGroup' },
      { label: 'New community', icon: 'earth-outline', screen: 'NewCommunity' },
      { label: 'New broadcast', icon: 'megaphone-outline', screen: 'NewBroadcast' },
      { label: 'Linked devices', icon: 'laptop-outline', screen: 'LinkedDevices' },
      { label: 'Starred', icon: 'star-outline', screen: 'Starred' },
      { label: 'Payments', icon: 'card-outline', screen: 'Payments' },
      { label: 'Read all', icon: 'mail-open-outline', screen: 'ReadAll' },
      { label: 'Settings', icon: 'settings-outline', screen: 'Settings' },
    ],
    []
  );

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents={isOpen ? 'auto' : 'none'}>
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={[styles.backdrop, { opacity: isOpen ? 1 : 0 }]} />
      </TouchableWithoutFeedback>

      <Animated.View style={[styles.drawer, { transform: [{ translateX }] }]}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.profileContainer}>
            <View style={styles.profileImageWrapper}>
              <Image
                source={{
                  uri: user.image || 'https://i.pravatar.cc/300',
                }}
                style={styles.profileImage}
                onError={() =>
                  setUser(prev => ({ ...prev, image: 'https://i.pravatar.cc/300' }))
                }
              />
            </View>
            <View>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userAbout}>{user.about}</Text>
              <Text style={styles.userAbout}>+91 {user.phone}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.menuSection}>
            {menuItems.map((item, index) => (
              <Pressable
                key={index}
                style={({ pressed }) => [
                  styles.link,
                  pressed && Platform.OS === 'ios' && { opacity: 0.6 },
                ]}
                android_ripple={{ color: theme.colors.primary2 }}
                onPress={() => navigateTo(item.screen)}
              >
                <Ionicons
                  name={item.icon}
                  size={22}
                  color={theme.colors.white}
                />
                <Text style={styles.linkText}>{item.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.spacer} />

          <Pressable
            onPress={handleLogout}
            android_ripple={{ color: theme.colors.error }}
            style={({ pressed }) => [
              styles.link,
              styles.logout,
              pressed && Platform.OS === 'ios' && { opacity: 0.6 },
            ]}
          >
            <Ionicons
              name="log-out-outline"
              size={22}
              color={theme.colors.error}
            />
            <Text style={[styles.linkText, { color: theme.colors.error }]}>
              Logout
            </Text>
          </Pressable>
        </SafeAreaView>
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  drawer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: DRAWER_WIDTH,
    backgroundColor: theme.colors.accent,
    zIndex: 100,
    elevation: 10,
    borderTopRightRadius: 20,
    borderBottomRightRadius: 20,
    shadowColor: theme.colors.dark,
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  safeArea: {
    flex: 1,
    padding: theme.spacing.l,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    zIndex: 1,
  },
  profileContainer: {
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    marginBottom: theme.spacing.m,
  },
  profileImageWrapper: {
    position: 'relative',
    width: 80,
    height: 80,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: theme.colors.white,
    backgroundColor: theme.colors.white,
    shadowColor: theme.colors.dark,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  userName: {
    color: theme.colors.white,
    fontSize: theme.fontSizes.title,
    fontWeight: '700',
  },
  userAbout: {
    color: theme.colors.light,
    fontSize: theme.fontSizes.small,
  },
  divider: {
    height: 1,
    backgroundColor: theme.colors.border,
    marginVertical: theme.spacing.m,
    opacity: 0.5,
  },
  menuSection: {
    paddingBottom: theme.spacing.m,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.s,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  linkText: {
    color: theme.colors.white,
    fontSize: theme.fontSizes.body,
    marginLeft: theme.spacing.s,
    fontWeight: '500',
  },
  logout: {
    backgroundColor: theme.colors.light,
    borderColor: theme.colors.white,
    borderWidth: 1,
  },
  spacer: {
    flex: 1,
  },
});

export default CustomDrawer;
