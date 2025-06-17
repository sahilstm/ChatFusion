import React from 'react';
import {
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Animated,
  ViewStyle,
  TextStyle,
} from 'react-native';
import theme from '../constant/theme';

type Variant = 'primary' | 'secondary' | 'outline' | 'error' | 'success';

interface Props {
  title: string;
  onPress: () => void;
  loading?: boolean;
  scaleAnim?: Animated.Value;
  style?: ViewStyle;
  textStyle?: TextStyle;
  variant?: Variant;
  disabled?: boolean;
}

const Button: React.FC<Props> = ({
  title,
  onPress,
  loading = false,
  scaleAnim,
  style,
  textStyle,
  variant = 'primary',
  disabled = false,
}) => {
  const getStyles = (): { button: ViewStyle; text: TextStyle } => {
    switch (variant) {
      case 'secondary':
        return {
          button: {
            backgroundColor: theme.colors.secondary,
          },
          text: {
            color: theme.colors.white,
          },
        };
      case 'outline':
        return {
          button: {
            backgroundColor: 'transparent',
            borderColor: theme.colors.primary,
            borderWidth: 1.5,
          },
          text: {
            color: theme.colors.primary,
          },
        };
      case 'error':
        return {
          button: {
            backgroundColor: theme.colors.error,
          },
          text: {
            color: theme.colors.white,
          },
        };
      case 'success':
        return {
          button: {
            backgroundColor: theme.colors.success,
          },
          text: {
            color: theme.colors.white,
          },
        };
      default:
        return {
          button: {
            backgroundColor: theme.colors.primary,
          },
          text: {
            color: theme.colors.white,
          },
        };
    }
  };

  const { button, text } = getStyles();

  const content = (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.button,
        button,
        style,
        disabled && { opacity: 0.6 },
      ]}
      activeOpacity={0.85}
      disabled={loading || disabled}
    >
      {loading ? (
        <ActivityIndicator color={text.color || theme.colors.white} />
      ) : (
        <Text style={[styles.buttonText, text, textStyle]}>{title}</Text>
      )}
    </TouchableOpacity>
  );

  return scaleAnim ? (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>{content}</Animated.View>
  ) : (
    content
  );
};

const styles = StyleSheet.create({
  button: {
    paddingVertical: theme.spacing.m,
    borderRadius: theme.spacing.s,
    alignItems: 'center',
    marginTop: theme.spacing.m,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonText: {
    fontSize: theme.fontSizes.body + 1,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
});

export default Button;
