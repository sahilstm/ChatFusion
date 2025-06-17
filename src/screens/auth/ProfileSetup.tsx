import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  ScrollView,
  Keyboard,
  Animated,
  Platform,
} from 'react-native';
import * as ImagePicker from 'react-native-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import Ionicons from 'react-native-vector-icons/Ionicons';

import axios from '../../utils/axiosInstance';
import Input from '../../shared/components/Input';
import Button from '../../shared/components/Button';
import theme from '../../shared/constant/theme';

const ProfileSetupScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [about, setAbout] = useState('');
  const [image, setImage] = useState(null);
  const [loading, setLoading] = useState(false);

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const logoAnim = useRef(new Animated.Value(0.5)).current;
  const headingSlide = useRef(new Animated.Value(20)).current;
  const btnScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(logoAnim, { toValue: 1, useNativeDriver: true }),
      Animated.spring(headingSlide, { toValue: 0, useNativeDriver: true }),
    ]).start();
  }, []);

  const pickImage = () => {
    ImagePicker.launchImageLibrary({ mediaType: 'photo' }, res => {
      if (res?.assets?.length) setImage(res.assets[0]);
    });
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    Toast.show({
      type,
      text1: message,
      position: 'top',
      visibilityTime: 3000,
    });
  };

  const handleSubmit = async () => {
    if (!name.trim() || !about.trim()) {
      showToast('error', 'Please fill all fields');
      return;
    }

    try {
      setLoading(true);
      const userStr = await AsyncStorage.getItem('user');
      const user = JSON.parse(userStr || '{}');

      const formData = new FormData();
      formData.append('name', name);
      formData.append('about', about);
      if (image) {
        formData.append('image', {
          uri: image.uri,
          name: 'profile.jpg',
          type: image.type,
        });
      }

      await axios.post(`/auth/update/${user._id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updatedUser = { ...user, name, about, image: image?.uri };
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      navigation.replace('ChatList');
    } catch (err: any) {
      console.error(err);
      showToast('error', 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const animateAndSubmit = () => {
    Animated.sequence([
      Animated.spring(btnScale, { toValue: 0.95, useNativeDriver: true }),
      Animated.spring(btnScale, { toValue: 1, useNativeDriver: true }),
    ]).start(handleSubmit);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={styles.fullScreen}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.container}>
          <View style={styles.ellipse1} />
          <View style={styles.ellipse2} />
          <View style={styles.ellipse3} />

          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={{ opacity: fadeAnim }}>
              <Animated.Image
                source={require('../../assets/logo.png')}
                style={[styles.logo, { transform: [{ scale: logoAnim }] }]}
                resizeMode="contain"
              />

              <Animated.Text
                style={[
                  styles.heading,
                  {
                    transform: [{ translateY: headingSlide }],
                    opacity: fadeAnim,
                  },
                ]}
              >
                Complete Your Profile
              </Animated.Text>
            </Animated.View>

            <TouchableOpacity onPress={pickImage}>
              <View style={styles.imageWrapper}>
                {image ? (
                  <Image source={{ uri: image.uri }} style={styles.image} />
                ) : (
                  <View style={styles.placeholder}>
                    <Text style={styles.placeholderText}>Select Image</Text>
                  </View>
                )}
                <View style={styles.cameraIconContainer}>
                  <Ionicons name="camera" size={20} color={theme.colors.white} />
                </View>
              </View>
            </TouchableOpacity>

            <Input
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder="Enter your name"
            />
            <Input
              label="About"
              value={about}
              onChangeText={setAbout}
              placeholder="A short bio"
            />

            <Button
              title="Continue"
              onPress={animateAndSubmit}
              loading={loading}
              scaleAnim={btnScale}
            />
          </ScrollView>

          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>You're almost there.</Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
};

export default ProfileSetupScreen;

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  container: {
    flex: 1,
    justifyContent: 'space-between',
  },
  ellipse1: {
    position: 'absolute',
    top: -180,
    left: -120,
    width: 350,
    height: 350,
    borderRadius: 225,
    backgroundColor: theme.colors.secondary,
    opacity: 0.06,
    zIndex: -1,
  },
  ellipse2: {
    position: 'absolute',
    top: -160,
    right: 100,
    width: 250,
    height: 250,
    borderRadius: 200,
    backgroundColor: theme.colors.primary,
    opacity: 0.08,
    zIndex: -1,
  },
  ellipse3: {
    position: 'absolute',
    bottom: -200,
    left: -80,
    width: 350,
    height: 350,
    borderRadius: 175,
    backgroundColor: theme.colors.accent,
    opacity: 0.05,
    zIndex: -1,
  },
  scroll: {
    flexGrow: 1,
    marginTop: 60,
    paddingHorizontal: theme.spacing.l,
    paddingVertical: theme.spacing.xl,
  },
  logo: {
    width: 90,
    height: 90,
    alignSelf: 'center',
    marginBottom: theme.spacing.l,
  },
  heading: {
    fontSize: theme.fontSizes.title,
    fontWeight: '700',
    color: theme.colors.text,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  placeholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: theme.colors.prefixBg,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: theme.spacing.l,
    borderWidth: 1,
    borderColor: theme.colors.white,
  },
  placeholderText: {
    color: theme.colors.subtext,
    fontSize: theme.fontSizes.caption,
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignSelf: 'center',
    marginBottom: theme.spacing.l,
  },
  imageWrapper: {
    alignSelf: 'center',
    position: 'relative',
    width: 100,
    height: 100,
    marginBottom: theme.spacing.l,
  },
  cameraIconContainer: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: theme.colors.primary,
    borderRadius: 15,
    padding: 5,
    borderWidth: 2,
    borderColor: theme.colors.white,
  },

  footerContainer: {
    paddingVertical: theme.spacing.s,
    alignItems: 'center',
  },
  footerText: {
    fontSize: theme.fontSizes.caption,
    color: theme.colors.subtext,
    textAlign: 'center',
  },
});
