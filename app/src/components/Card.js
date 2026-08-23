import React from 'react';
import { View, StyleSheet } from 'react-native';
import { colors, radius } from '../theme';

export default function Card({ children, style }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(234,249,246,0.05)',
    borderRadius: radius + 2,
    borderWidth: 1,
    borderColor: 'rgba(234,249,246,0.10)',
    padding: 16
  }
});
