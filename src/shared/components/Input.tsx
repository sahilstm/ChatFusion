import React from 'react';
import { View, Text, TextInput, StyleSheet, TextInputProps } from 'react-native';
import theme from '../constant/theme';

interface InputProps extends TextInputProps {
  label?: string;
  prefix?: string;
  value: string;
  onChangeText: (text: string) => void;
}

const Input: React.FC<InputProps> = ({ label, prefix, value, onChangeText, ...rest }) => {
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.inputWrapper}>
        {prefix && (
          <View style={styles.prefixBox}>
            <Text style={styles.prefixText}>{prefix}</Text>
          </View>
        )}
        <TextInput
          style={[styles.input, prefix && { paddingLeft: 0 }]}
          value={value}
          onChangeText={onChangeText}
          placeholderTextColor="#A0A9B8"
          selectionColor={theme.colors.primary}
          {...rest}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: theme.spacing.m,
  },
  label: {
    fontSize: theme.fontSizes.small,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: theme.spacing.s,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.2,
    borderColor: theme.colors.border,
    borderRadius: theme.spacing.s,
    backgroundColor: theme.colors.neutralLight,
    paddingHorizontal: theme.spacing.s,
  },
  prefixBox: {
    paddingHorizontal: theme.spacing.s,
    paddingVertical: theme.spacing.s,
    backgroundColor: theme.colors.prefixBg,
    borderRadius: theme.spacing.s / 2,
    marginRight: theme.spacing.s,
  },
  prefixText: {
    fontSize: theme.fontSizes.small,
    color: theme.colors.text,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    height: 50,
    fontSize: theme.fontSizes.body,
    color: theme.colors.text,
    paddingVertical: 0,
  },
});

export default Input;
