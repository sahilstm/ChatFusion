import React, { useEffect, useState } from 'react';
import {
  View,
  FlatList,
  Text,
  TouchableOpacity,
  PermissionsAndroid,
  Platform,
  Alert,
  StyleSheet,
} from 'react-native';
import Contacts from 'react-native-contacts';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from '../../utils/axiosInstance';
import { NativeStackScreenProps } from '@react-navigation/native-stack';

type Props = NativeStackScreenProps<any, 'Contacts'>;

interface Contact {
  id: string;
  name: string;
  phone: string;
  isRegistered: boolean;
  _id?: string;
}

const ContactsScreen: React.FC<Props> = ({ navigation }) => {
  const [contacts, setContacts] = useState<Contact[]>([]);
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
        Alert.alert(
          'Permission Denied',
          'Please allow contacts access in settings to continue.',
        );
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

      setContacts(merged);
    } catch (err) {
      console.error('Contacts error', err);
      Alert.alert('Error fetching contacts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAndFilter();
  }, []);

  const renderItem = ({ item }: { item: Contact }) => (
    <TouchableOpacity
      style={styles.item}
      disabled={!item.isRegistered}
      onPress={() =>
        item.isRegistered && navigation.navigate('Chat', { user: item })
      }
    >
      <View>
        <Text style={styles.name}>{item.name || item.phone}</Text>
        <Text style={styles.phone}>{item.phone}</Text>
      </View>

      {!item.isRegistered && <Text style={styles.invite}>Invite</Text>}
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <Text>Loading contacts...</Text>
      ) : (
        <FlatList
          data={contacts}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          ListEmptyComponent={<Text>No contacts found.</Text>}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  item: {
    padding: 12,
    borderBottomWidth: 1,
    borderColor: '#eee',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  name: { fontSize: 16, fontWeight: 'bold' },
  phone: { fontSize: 14, color: '#555' },
  invite: { color: 'blue', fontSize: 14, fontWeight: '600' },
});

export default ContactsScreen;
