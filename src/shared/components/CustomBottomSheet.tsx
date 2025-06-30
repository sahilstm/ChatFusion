import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  PanResponder,
  Dimensions,
  TouchableOpacity,
  Keyboard,
  Pressable,
} from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import HapticFeedback from 'react-native-haptic-feedback';
import { launchCamera, launchImageLibrary } from 'react-native-image-picker';
import theme from '../constant/theme';
import { useNavigation } from '@react-navigation/native';

const SCREEN_HEIGHT = Dimensions.get('window').height;

interface Props {
  visible: boolean;
  onClose: () => void;
}

const CustomBottomSheet: React.FC<Props> = ({ visible, onClose }) => {
  const navigation = useNavigation();

  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const onGalleryPress = () => {
    launchImageLibrary({ mediaType: 'photo' }, response => {
      if (response.didCancel || response.errorCode) return;
      const uri = response.assets?.[0]?.uri;
      if (uri) {
        onClose();
        navigation.navigate('ImageEditor', { uri });
      }
    });
  };

  const onCameraPress = () => {
    launchCamera({ mediaType: 'photo' }, response => {
      if (response.didCancel || response.errorCode) return;
      const uri = response.assets?.[0]?.uri;
      if (uri) {
        onClose();
        navigation.navigate('ImageEditor', { uri });
      }
    });
  };

  const items = [
    {
      label: 'Gallery',
      icon: 'image',
      color: '#3B82F6',
      onPress: onGalleryPress,
    },
    {
      label: 'Camera',
      icon: 'camera',
      color: '#EC4899',
      onPress: onCameraPress,
    },
    { label: 'Location', icon: 'location', color: '#10B981' },
    { label: 'Contact', icon: 'person', color: '#3B82F6' },
    { label: 'Document', icon: 'document-text', color: '#8B5CF6' },
    { label: 'Audio', icon: 'headset', color: '#F97316' },
    { label: 'Poll', icon: 'stats-chart', color: '#FBBF24' },
    { label: 'Payment', icon: 'cash', color: '#059669' },
  ];

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => gesture.dy > 10,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dy > 0) {
          translateY.setValue(gesture.dy);
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy > 100) {
          closeSheet();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    }),
  ).current;

  const openSheet = () => {
    Keyboard.dismiss();
    HapticFeedback.trigger('impactMedium');
    Animated.timing(translateY, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
  };

  const closeSheet = () => {
    HapticFeedback.trigger('impactMedium');
    Animated.timing(translateY, {
      toValue: SCREEN_HEIGHT,
      duration: 250,
      useNativeDriver: true,
    }).start(() => onClose());
  };

  useEffect(() => {
    visible ? openSheet() : closeSheet();
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable style={styles.overlay} onPress={closeSheet} />
      <Animated.View
        style={[styles.sheetContainer, { transform: [{ translateY }] }]}
        {...panResponder.panHandlers}
      >
        <View style={styles.indicator} />
        <View style={styles.content}>
          {items.map(item => (
            <TouchableOpacity
              key={item.label}
              style={styles.option}
              onPress={item.onPress}
            >
              <Ionicons name={item.icon} size={26} color={item.color} />
              <Text style={styles.label}>{item.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>
    </View>
  );
};

export default CustomBottomSheet;

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sheetContainer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    height: SCREEN_HEIGHT * 0.35,
    backgroundColor: theme.colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    zIndex: 100,
    elevation: 20,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: -4 },
    shadowRadius: 8,
  },
  indicator: {
    width: 40,
    height: 5,
    borderRadius: 4,
    backgroundColor: theme.colors.accent,
    alignSelf: 'center',
    marginVertical: 10,
  },
  content: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  option: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: theme.colors.card,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  label: {
    marginTop: 6,
    color: theme.colors.text,
    fontSize: theme.fontSizes.caption,
    textAlign: 'center',
  },
});
