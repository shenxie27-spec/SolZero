import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { colors } from '../theme';

const TABS = [
  { key: 'home', icon: 'home' },
  { key: 'checkin', icon: 'checkin' },
  { key: 'points', icon: 'points' },
  { key: 'invite', icon: 'invite' },
  { key: 'profile', icon: 'profile' }
];

function TabIcon({ type, color }) {
  return (
    <View style={styles.iconBox}>
      {type === 'home' ? (
        <View style={styles.iconHome}>
          <View style={[styles.homeRoof, { borderColor: color }]} />
          <View style={[styles.homeBody, { borderColor: color }]} />
        </View>
      ) : null}
      {type === 'checkin' ? (
        <View style={[styles.iconCal, { borderColor: color }]}>
          <View style={[styles.calBand, { backgroundColor: color }]} />
          <View style={[styles.calDot, { backgroundColor: color }]} />
          <View style={[styles.calDotR, { backgroundColor: color }]} />
          <View style={[styles.calLine, { backgroundColor: color }]} />
        </View>
      ) : null}
      {type === 'points' ? <View style={[styles.iconDiamond, { borderColor: color }]} /> : null}
      {type === 'invite' ? (
        <View style={[styles.iconGift, { borderColor: color }]}>
          <View style={[styles.giftBand, { backgroundColor: color }]} />
          <View style={[styles.giftRibbon, { backgroundColor: color }]} />
        </View>
      ) : null}
      {type === 'profile' ? (
        <View style={styles.iconPerson}>
          <View style={[styles.personHead, { borderColor: color }]} />
          <View style={[styles.personBody, { borderColor: color }]} />
        </View>
      ) : null}
    </View>
  );
}

export default function TabBar({ active, onChange }) {
  const { t } = useTranslation();
  return (
    <View style={styles.bar}>
      {TABS.map((tab) => {
        const isActive = active === tab.key;
        const color = isActive ? colors.accent : colors.textFaint;
        return (
          <Pressable key={tab.key} style={styles.item} onPress={() => onChange(tab.key)}>
            <TabIcon type={tab.icon} color={color} />
            <Text style={[styles.label, isActive && styles.labelActive]}>{t('tab.' + tab.key)}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    backgroundColor: 'rgba(13,20,23,0.94)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(234,249,246,0.08)',
    paddingBottom: 8,
    paddingTop: 6
  },
  item: { flex: 1, alignItems: 'center', gap: 3 },
  iconBox: { width: 24, height: 22, alignItems: 'center', justifyContent: 'center' },
  iconHome: { width: 20, height: 20 },
  homeRoof: {
    position: 'absolute',
    top: 2,
    left: 4,
    width: 11,
    height: 11,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    transform: [{ rotate: '45deg' }]
  },
  homeBody: {
    position: 'absolute',
    bottom: 0,
    left: 2,
    right: 2,
    height: 11,
    borderWidth: 2,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderBottomLeftRadius: 2,
    borderBottomRightRadius: 2
  },
  iconCal: { width: 19, height: 19, borderWidth: 2, borderRadius: 4 },
  calBand: { position: 'absolute', top: 3, left: 0, right: 0, height: 2 },
  calDot: { position: 'absolute', left: 4, top: 8, width: 3, height: 3, borderRadius: 2 },
  calDotR: { position: 'absolute', right: 4, top: 8, width: 3, height: 3, borderRadius: 2 },
  calLine: { position: 'absolute', left: 7, top: 12, width: 6, height: 2, borderRadius: 1 },
  iconDiamond: { width: 14, height: 14, borderWidth: 2, borderRadius: 2, transform: [{ rotate: '45deg' }] },
  iconGift: { width: 19, height: 19, borderWidth: 2, borderRadius: 4 },
  giftBand: { position: 'absolute', top: 6, left: 0, right: 0, height: 2 },
  giftRibbon: { position: 'absolute', top: 0, left: 8, width: 2, height: 17 },
  iconPerson: { width: 20, height: 20, alignItems: 'center' },
  personHead: { width: 8, height: 8, borderRadius: 4, borderWidth: 2 },
  personBody: {
    marginTop: 2,
    width: 16,
    height: 8,
    borderWidth: 2,
    borderBottomWidth: 0,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8
  },
  label: { fontSize: 11, color: colors.textFaint },
  labelActive: { color: colors.accent, fontWeight: '700' }
});
