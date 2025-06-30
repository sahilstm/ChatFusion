import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Animated,
  PanResponder,
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { PinchGestureHandler } from 'react-native-gesture-handler';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { SafeAreaView } from 'react-native-safe-area-context';
import theme from '../../shared/constant/theme';

type RootStackParamList = {
  ImageEditor: { uri: string; croppedUri?: string };
};

const ImageEditorScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'ImageEditor'>>();
  const navigation = useNavigation();
  const { uri, croppedUri } = route.params;

  const [imageUri, setImageUri] = useState(uri);
  const [caption, setCaption] = useState('');
  const [loading] = useState(false);

  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (croppedUri) setImageUri(croppedUri);
  }, [croppedUri]);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.setOffset({
          x: pan.x._value,
          y: pan.y._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  const handlePinchGestureEvent = Animated.event(
    [{ nativeEvent: { scale: scale } }],
    { useNativeDriver: false }
  );

  const handleSend = () => {
    console.log('Final Image:', imageUri);
    console.log('Caption:', caption);
    navigation.goBack();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Icon name="arrow-left" size={24} color={theme.colors.white} />
          </TouchableOpacity>
          <View style={styles.headerRight}>
            <TouchableOpacity
              onPress={() =>
                navigation.navigate('CropImage', {
                  uri: imageUri,
                })
              }
            >
              <Icon name="crop-rotate" size={24} color={theme.colors.white} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Image Zoom + Pan */}
        <View style={styles.imageWrapper}>
          {loading ? (
            <ActivityIndicator size="large" color={theme.colors.white} />
          ) : (
            <PinchGestureHandler onGestureEvent={handlePinchGestureEvent}>
              <Animated.View
                style={{
                  transform: [
                    { translateX: pan.x },
                    { translateY: pan.y },
                    { scale },
                  ],
                }}
                {...panResponder.panHandlers}
              >
                <Image
                  source={{ uri: imageUri }}
                  style={styles.image}
                  resizeMode="contain"
                />
              </Animated.View>
            </PinchGestureHandler>
          )}
        </View>

        {/* Caption Input */}
        <View style={styles.captionBar}>
          <TextInput
            style={styles.captionInput}
            placeholder="Add a caption..."
            placeholderTextColor={theme.colors.subtext}
            value={caption}
            onChangeText={setCaption}
            returnKeyType="done"
          />
          <TouchableOpacity style={styles.sendBtn} onPress={handleSend}>
            <Icon
              name="check"
              size={theme.fontSizes.title}
              color={theme.colors.primary}
            />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </TouchableWithoutFeedback>
  );
};

export default ImageEditorScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing.m,
    backgroundColor: theme.colors.primary2,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.m,
  },
  imageWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  image: {
    width: 300,
    height: 300,
  },
  captionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: theme.spacing.m,
    borderTopColor: theme.colors.white,
    borderTopWidth: 1,
  },
  captionInput: {
    color: theme.colors.text,
    fontSize: theme.fontSizes.small,
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.m,
    paddingVertical: theme.spacing.sm,
    borderRadius: theme.spacing.xl,
    width: '84%',
  },
  sendBtn: {
    backgroundColor: theme.colors.white,
    padding: theme.spacing.sm,
    borderRadius: 100,
  },
});
