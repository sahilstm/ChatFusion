import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  Text,
  View,
  Dimensions,
} from 'react-native';
import theme from '../../shared/constant/theme';

const { width } = Dimensions.get('window');

const Splash = ({}) => {
  const logoAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const textFade = useRef(new Animated.Value(0)).current;
  const taglineShineAnim = useRef(new Animated.Value(-1)).current;
  const glowPulse = useRef(new Animated.Value(1)).current;

  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  const containerOpacity = useRef(new Animated.Value(1)).current;
  const containerScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoAnim, {
        toValue: 1,
        useNativeDriver: true,
        friction: 5,
        tension: 120,
      }),
      Animated.timing(rotateAnim, {
        toValue: 1,
        duration: 1500,
        easing: Easing.elastic(1),
        useNativeDriver: true,
      }),
    ]).start();

    Animated.timing(textFade, {
      toValue: 1,
      duration: 800,
      delay: 1000,
      useNativeDriver: true,
    }).start();

    Animated.loop(
      Animated.timing(taglineShineAnim, {
        toValue: 1,
        duration: 2200,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(glowPulse, {
          toValue: 1.4,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(glowPulse, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    const pulse = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(dot, {
            toValue: 1,
            duration: 400,
            delay,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0.3,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      );

    pulse(dot1, 0).start();
    pulse(dot2, 150).start();
    pulse(dot3, 300).start();

    setTimeout(() => {
      Animated.parallel([
        Animated.timing(containerOpacity, {
          toValue: 0.95,
          duration: 500,
          useNativeDriver: true,
        }),
        Animated.timing(containerScale, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }),
      ]).start();
    }, 3500);
  }, []);

  const logoBounce = logoAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.6, 1],
  });

  const logoRotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '5deg'],
  });

  const taglineShine = taglineShineAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-width * 0.6, width * 0.6],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: containerOpacity,
          transform: [{ scale: containerScale }],
        },
      ]}
    >
      <View style={styles.ellipseTopLeft} />
      <View style={styles.ellipseBottomRight} />
      <Animated.View
        style={[styles.glowCircle, { transform: [{ scale: glowPulse }] }]}
      />

      <Animated.View
        style={[
          styles.logoContainer,
          {
            transform: [{ scale: logoBounce }, { rotate: logoRotate }],
          },
        ]}
      >
        <Image
          source={require('../../assets/logo.png')}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      <Animated.Text style={[styles.tagline, { opacity: textFade }]}>
        Secure. Smart. Simple.
      </Animated.Text>

      <Animated.View
        style={[styles.shimmer, { transform: [{ translateX: taglineShine }] }]}
      />

      <View style={styles.loaderContainer}>
        <Animated.View style={[styles.dot, { opacity: dot1 }]} />
        <Animated.View style={[styles.dot, { opacity: dot2 }]} />
        <Animated.View style={[styles.dot, { opacity: dot3 }]} />
      </View>
    </Animated.View>
  );
};

export default Splash;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ellipseTopLeft: {
    position: 'absolute',
    top: -80,
    left: -80,
    width: 200,
    height: 200,
    backgroundColor: theme.colors.primary,
    borderRadius: 100,
    opacity: 0.1,
  },
  ellipseBottomRight: {
    position: 'absolute',
    bottom: -100,
    right: -100,
    width: 250,
    height: 250,
    backgroundColor: theme.colors.primary2,
    borderRadius: 125,
    opacity: 0.1,
  },
  glowCircle: {
    position: 'absolute',
    width: width * 0.45,
    height: width * 0.45,
    backgroundColor: theme.colors.primary,
    opacity: 0.2,
    borderRadius: 1000,
    zIndex: -1,
  },
  logoContainer: {
    width: width * 0.5,
    height: width * 0.5,
    backgroundColor: '#fff',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    marginBottom: 20,
  },
  logo: {
    width: '85%',
    height: '85%',
  },
  tagline: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.colors.primary2,
    letterSpacing: 0.6,
    textAlign: 'center',
    marginTop: 4,
  },
  shimmer: {
    position: 'absolute',
    bottom: width * 0.25 + 50,
    height: 20,
    width: '40%',
    backgroundColor: 'rgba(255,255,255,0.25)',
    transform: [{ rotate: '20deg' }],
  },
  loaderContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: theme.colors.primary2,
  },
});
