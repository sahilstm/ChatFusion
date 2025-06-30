import React, { useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Text,
} from 'react-native';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import theme from '../../shared/constant/theme';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CropView } from 'react-native-image-crop-tools';
import RNFS from 'react-native-fs';

type RootStackParamList = {
  CropImage: { uri: string };
};

const CropImageScreen = () => {
  const route = useRoute<RouteProp<RootStackParamList, 'CropImage'>>();
  const navigation = useNavigation();
  const { uri } = route.params;

  const cropViewRef = useRef<any>(null);
  const [aspectRatio, setAspectRatio] = useState<{ width: number; height: number } | null>({
    width: 1,
    height: 1,
  });
  const [cropKey, setCropKey] = useState(0);

  const moveToPermanentStorage = async (tempUri: string): Promise<string> => {
    const filename = `cropped_${Date.now()}.jpg`;
    const newPath = `${RNFS.DocumentDirectoryPath}/${filename}`;
    try {
      await RNFS.moveFile(tempUri.replace('file://', ''), newPath);
      return `file://${newPath}`;
    } catch (err) {
      console.error('Error moving file:', err);
      return tempUri;
    }
  };

  const handleImageCrop = async (result: { uri: string }) => {
    const savedUri = await moveToPermanentStorage(result.uri);
    navigation.navigate('ImageEditor', { uri, croppedUri: savedUri });
  };

  const handleCrop = () => {
    cropViewRef.current?.saveImage(true, 90);
  };

  const handleRotateLeft = () => {
    cropViewRef.current?.rotateImage(false);
  };

  const handleRotateRight = () => {
    cropViewRef.current?.rotateImage(true);
  };

  const updateAspectRatio = (ratio: { width: number; height: number } | null) => {
    setAspectRatio(ratio);
    setCropKey(prev => prev + 1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="arrow-left" size={24} color={theme.colors.white} />
        </TouchableOpacity>
      </View>

      <View style={styles.image}>
        <CropView
          key={cropKey}
          sourceUrl={uri}
          style={styles.cropView}
          ref={cropViewRef}
          onImageCrop={handleImageCrop}
          keepAspectRatio={aspectRatio !== null}
          aspectRatio={aspectRatio || undefined}
        />
      </View>

      <View style={styles.ratioBar}>
        <TouchableOpacity onPress={() => updateAspectRatio(null)}>
          <Text style={styles.ratioText}>Free</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => updateAspectRatio({ width: 1, height: 1 })}>
          <Text style={styles.ratioText}>1:1</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => updateAspectRatio({ width: 4, height: 3 })}>
          <Text style={styles.ratioText}>4:3</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => updateAspectRatio({ width: 16, height: 9 })}>
          <Text style={styles.ratioText}>16:9</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.bottomBar}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Icon name="close" size={30} color={theme.colors.white} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRotateLeft}>
          <Icon name="format-rotate-90" size={30} color={theme.colors.white} style={{ transform: [{ rotate: '180deg' }] }} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleRotateRight}>
          <Icon name="format-rotate-90" size={30} color={theme.colors.white} />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleCrop}>
          <Icon name="check" size={30} color={theme.colors.white} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default CropImageScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.primary2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: theme.spacing.m,
    backgroundColor: theme.colors.primary2,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    width: '100%',
  },
  image: {
    flex: 1,
    width: '100%',
  },
  cropView: {
    flex: 1,
    width: '100%',
  },
  ratioBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingVertical: theme.spacing.s,
    backgroundColor: theme.colors.dark,
  },
  ratioText: {
    color: theme.colors.white,
    fontSize: theme.fontSizes.body,
    paddingHorizontal: theme.spacing.l,
  },
  bottomBar: {
    marginVertical: theme.spacing.m,
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.m,
  },
});
