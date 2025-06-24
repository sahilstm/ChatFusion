import React, { useEffect, useState } from 'react';
import {
  View,
  SectionList,
  Text,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  StyleSheet,
  ActivityIndicator,
  Linking,
} from 'react-native';
import Contacts from 'react-native-contacts';
import axios from '../../utils/axiosInstance';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import Ionicons from 'react-native-vector-icons/Ionicons';
import theme from '../../shared/constant/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';

type Props = NativeStackScreenProps<any, 'Contacts'>;

interface Contact {
  id: string;
  name: string;
  phone: string;
  isRegistered: boolean;
  _id?: string;
}

interface Section {
  title: string;
  data: Contact[];
}

const ContactsScreen: React.FC<Props> = ({ navigation }) => {
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchAndFilter = async () => {
    try {
      setLoading(true);
      let permissionGranted = false;

      if (Platform.OS === 'android') {
        const permission = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
          {
            title: 'Contacts Access Required',
            message:
              'This app needs access to your contacts to show registered users.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          },
        );
        permissionGranted = permission === PermissionsAndroid.RESULTS.GRANTED;
      } else {
        const status = await Contacts.checkPermission();
        if (status === 'undefined') {
          const requestStatus = await Contacts.requestPermission();
          permissionGranted = requestStatus === 'authorized';
        } else {
          permissionGranted = status === 'authorized';
        }
      }

      if (!permissionGranted) {
        Toast.show({
          type: 'error',
          text1: 'Permission Denied',
          text2: 'Please allow contacts access in settings to continue.',
        });
        setLoading(false);
        return;
      }

      const allContacts = await Contacts.getAll();
      const cleanedContacts: Contact[] = allContacts
        .map(c => {
          const phoneRaw = c.phoneNumbers[0]?.number || '';
          const cleanPhone = phoneRaw.replace(/\D/g, '').slice(-10);
          return {
            id: c.recordID,
            name: c.givenName + (c.familyName ? ` ${c.familyName}` : ''),
            phone: cleanPhone,
            isRegistered: false,
          };
        })
        .filter(c => !!c.phone);

      const phoneNumbers = cleanedContacts.map(c => c.phone);
      const { data } = await axios.post('/auth/filter-registered', {
        phones: phoneNumbers,
      });

      const registeredMap: Record<string, any> = {};
      data.registeredUsers.forEach((u: any) => {
        registeredMap[u.phone] = u;
      });

      const merged = cleanedContacts.map(contact => {
        if (registeredMap[contact.phone]) {
          return {
            ...contact,
            isRegistered: true,
            _id: registeredMap[contact.phone]._id,
          };
        }
        return contact;
      });

      const registered = merged
        .filter(c => c.isRegistered)
        .sort((a, b) => a.name.localeCompare(b.name));

      const unregistered = merged
        .filter(c => !c.isRegistered)
        .sort((a, b) => a.name.localeCompare(b.name));

      const sectionListData: Section[] = [];

      if (registered.length > 0) {
        sectionListData.push({
          title: 'Registered Contacts',
          data: registered,
        });
      }

      if (unregistered.length > 0) {
        sectionListData.push({
          title: 'Others (Unregistered)',
          data: unregistered,
        });
      }

      setSections(sectionListData);
    } catch (err) {
      console.error('Contacts error', err);
      Toast.show({
        type: 'error',
        text1: 'Error fetching contacts',
        text2: 'Something went wrong while accessing your contacts.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndFilter();
  }, []);

  const renderItem = ({ item }: { item: Contact }) => {
    const handleInvite = (phone: string) => {
      const message = `Hey! I'm using Chat App. Join me: https://levelupsolution.in/`;
      const url = `sms:${phone}?body=${encodeURIComponent(message)}`;

      Linking.openURL(url).catch(err => {
        Toast.show({
          type: 'error',
          text1: 'Unable to open SMS app',
          text2: 'Please check your default messaging app.',
        });
        console.error('SMS Error', err);
      });
    };

    console.log(handleInvite);

    return (
      <TouchableOpacity
        style={styles.item}
        onPress={() =>
          item.isRegistered
            ? navigation.navigate('Chat', { user: item })
            : handleInvite(item.phone)
        }
      >
        <View>
          <Text style={styles.name}>{item.name || item.phone}</Text>
          <Text style={styles.phone}>{item.phone}</Text>
        </View>
        {!item.isRegistered && <Text style={styles.invite}>Invite</Text>}
      </TouchableOpacity>
    );
  };

  const renderSectionHeader = ({ section }: { section: Section }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{section.title}</Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Contacts</Text>
        <TouchableOpacity onPress={() => {}}>
          <Ionicons name="search" size={24} color={theme.colors.text} />
        </TouchableOpacity>
      </View>
      <View style={styles.container}>
        {loading ? (
          <ActivityIndicator size="large" color={theme.colors.primary} />
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={item => item.id}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            ListEmptyComponent={
              <Text style={styles.empty}>No contacts found.</Text>
            }
            stickySectionHeadersEnabled
          />
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: theme.colors.white },
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.m,
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
  },
  headerTitle: {
    fontSize: theme.fontSizes.title,
    fontWeight: 'bold',
    color: theme.colors.text,
  },
  sectionHeader: {
    backgroundColor: theme.colors.neutralLight,
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.s,
  },
  sectionHeaderText: {
    fontWeight: '700',
    fontSize: theme.fontSizes.small,
    color: theme.colors.secondary,
    paddingHorizontal: theme.spacing.m,
  },
  item: {
    paddingVertical: theme.spacing.m,
    borderBottomWidth: 1,
    borderColor: theme.colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.m,
  },
  name: {
    fontSize: theme.fontSizes.body,
    fontWeight: '600',
    color: theme.colors.text,
  },
  phone: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.subtext,
  },
  invite: {
    color: theme.colors.primary,
    fontSize: theme.fontSizes.small,
    fontWeight: '600',
  },
  empty: {
    textAlign: 'center',
    marginTop: 40,
    color: theme.colors.subtext,
    fontSize: theme.fontSizes.body,
  },
});

export default ContactsScreen;
