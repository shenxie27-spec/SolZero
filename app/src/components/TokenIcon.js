import React, { useState } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import { API_URL } from '../config';

const FALLBACK_PALETTE = ['#5FD8C8', '#FFC94D', '#7EA6F0', '#B58CF0', '#F08C8C', '#8CD0B0'];

function hashMint(mint) {
  let h = 0;
  for (let i = 0; i < mint.length; i += 1) {
    h = (h * 31 + mint.charCodeAt(i)) >>> 0;
  }
  return h;
}

function patternFor(mint) {
  const h = hashMint(mint || '');
  const cells = [];
  for (let y = 0; y < 5; y += 1) {
    for (let x = 0; x < 3; x += 1) {
      cells.push(((h >> ((y * 3 + x) % 31)) & 1) === 1);
    }
  }
  return cells;
}

export default function TokenIcon({ mint, meta, size = 34 }) {
  const [failed, setFailed] = useState(false);

  const hasIcon = !!(meta && meta.hasIcon);

  if (mint && hasIcon && !failed) {
    return (
      <Image
        source={{ uri: `${API_URL}/api/token/${mint}/icon` }}
        style={[styles.imgOnly, { width: size, height: size, borderRadius: size / 2 }]}
        onError={() => setFailed(true)}
      />
    );
  }

  const hash = hashMint(mint || '');
  const fg = FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
  const bg = FALLBACK_PALETTE[(hash >> 4) % FALLBACK_PALETTE.length];
  const cells = patternFor(mint || '');
  const cell = Math.max(2, Math.round(size * 0.09));
  const gap = Math.max(1, Math.round(size * 0.015));

  return (
    <View
      style={[
        styles.fallback,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: bg + '24',
          borderColor: fg + '59'
        }
      ]}
    >
      {[0, 1, 2, 3, 4].map((y) => (
        <View key={y} style={{ flexDirection: 'row' }}>
          {[0, 1, 2, 3, 4].map((x) => {
            const idx = y * 3 + (x < 3 ? x : 4 - x);
            const on = cells[idx];
            return (
              <View
                key={x}
                style={{
                  width: cell,
                  height: cell,
                  margin: gap,
                  borderRadius: Math.max(1, Math.round(cell * 0.3)),
                  backgroundColor: on ? fg : 'transparent'
                }}
              />
            );
          })}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  imgOnly: { backgroundColor: 'rgba(95,216,200,0.08)', borderWidth: 1, borderColor: 'rgba(234,249,246,0.18)' },
  fallback: { borderWidth: 1, alignItems: 'center', justifyContent: 'center' }
});
