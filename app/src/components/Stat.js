import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors } from '../theme';

export default function Stat({ label, value, valueColor, hint }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.right}>
        <Text style={[styles.value, valueColor ? { color: valueColor } : null]}>{value}</Text>
        {hint ? <Text style={styles.hint}>{hint}</Text> : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8
  },
  label: { color: colors.textDim, fontSize: 14 },
  right: { alignItems: 'flex-end' },
  value: { color: colors.text, fontSize: 16, fontWeight: '700' },
  hint: { color: colors.textFaint, fontSize: 12, marginTop: 2 }
});