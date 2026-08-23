import React, { useState } from 'react';
import { Image, View, Text, StyleSheet } from 'react-native';
import { API_URL } from '../config';

const FALLBACK_PALETTE = ['#5FD8C8', '#FFC94D', '#7EA6F0', '#B58CF0', '#F08C8C', '#8CD0B0'];

function hashMint(mint) {
  let h = 0;
  for (let i = 0; i < mint.length; i += 1) {
    h = (h * 31 + mint.charCodeAt(i)) >>> 0;
  }
  return h;
}

export default function TokenIcon({ mint, size = 34 }) {
  const [failed, setFailed] = useState(false);

  if (mint && !failed) {
    return (
      <Image
        source={{ uri: `${API_URL}/api/token/${mint}/icon` }}
        style={[styles.img, { width: size, height: size, borderRadius: size / 2 }]}
        onError={() => setFailed(true)}
      />
    );
  }

  const color = FALLBACK_PALETTE[hashMint(mint || '') % FALLBACK_PALETTE.length];
  const letter = ((mint && mint[0]) || 'S').toUpperCase();
  return (
    <View
      style={[
        styles.fallback,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: color + '1F', borderColor: color + '59' }
      ]}
    >
      <Text style={{ color, fontSize: Math.round(size * 0.38), fontWeight: '800' }}>{letter}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  img: { backgroundColor: 'rgba(95,216,200,0.08)', borderWidth: 1, borderColor: 'rgba(234,249,246,0.10)' },
  fallback: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' }
});
