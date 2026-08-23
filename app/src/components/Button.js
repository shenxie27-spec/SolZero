import React from 'react';
import { Pressable, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

export default function Button({ title, onPress, variant = 'primary', disabled, loading, style }) {
  const palette = {
    primary: { bg: colors.primary, fg: '#0A2420', border: 'transparent' },
    accent: { bg: colors.accent, fg: '#06281C', border: 'transparent' },
    ghost: { bg: 'rgba(234,249,246,0.06)', fg: colors.text, border: 'rgba(234,249,246,0.10)' },
    danger: { bg: 'rgba(255,107,107,0.12)', fg: colors.danger, border: 'rgba(255,107,107,0.35)' }
  }[variant];

  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.base,
        {
          backgroundColor: palette.bg,
          borderColor: palette.border,
          opacity: disabled ? 0.45 : pressed ? 0.82 : 1
        },
        style
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.fg} />
      ) : (
        <Text style={[styles.text, { color: palette.fg }]}>{title}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: radius + 2,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20
  },
  text: {
    fontSize: 16,
    fontWeight: '700'
  }
});
