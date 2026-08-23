import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from '../i18n';
import { api, clearStoredToken } from '../api';
import { shortWallet } from '../format';
import Card from '../components/Card';
import Header from '../components/Header';
import Button from '../components/Button';
import { colors } from '../theme';
import { APP_NAME } from '../config';

const LANGS = [
  { key: 'zh', label: 'langZh' },
  { key: 'en', label: 'langEn' },
  { key: 'ja', label: 'langJa' },
  { key: 'ko', label: 'langKo' }
];

export default function ProfileScreen({ onLogout }) {
  const { t } = useTranslation();
  const [me, setMe] = useState(null);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const data = await api('/me');
      setMe(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function changeLang(key) {
    await i18n.changeLanguage(key);
    try {
      await AsyncStorage.setItem('solzero.lang', key);
    } catch (err) {
      // ignore
    }
  }

  function confirmDelete() {
    Alert.alert(t('profile.deleteAccount'), t('profile.deleteConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api('/account', { method: 'DELETE' });
            await clearStoredToken();
            onLogout();
          } catch (err) {
            setError(err.message);
          }
        }
      }
    ]);
  }

  function confirmLogout() {
    Alert.alert(APP_NAME, t('common.logout') + '?', [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.confirm'),
        onPress: async () => {
          await clearStoredToken();
          onLogout();
        }
      }
    ]);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
<Header title={t('profile.title')} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Card style={{ marginTop: 16 }}>
        <View style={styles.row}>
          <Text style={styles.label}>{t('profile.wallet')}</Text>
          <Text style={styles.value}>{me ? shortWallet(me.user.wallet) : '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('common.points')}</Text>
          <Text style={[styles.value, { color: colors.gold }]}>{me ? me.user.points : '—'}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>{t('profile.joined')}</Text>
          <Text style={styles.value}>{me ? String(me.user.createdAt).slice(0, 10) : '—'}</Text>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>{t('profile.language')}</Text>
      <Card>
        {LANGS.map((lang) => (
          <Pressable key={lang.key} style={styles.langRow} onPress={() => changeLang(lang.key)}>
            <Text style={styles.langLabel}>{t('profile.' + lang.label)}</Text>
            {i18n.language === lang.key ? <Text style={styles.langCheck}>✓</Text> : null}
          </Pressable>
        ))}
      </Card>

      <Button title={t('common.logout')} onPress={confirmLogout} variant="ghost" style={{ marginTop: 20 }} />
      <Button title={t('profile.deleteAccount')} onPress={confirmDelete} variant="danger" style={{ marginTop: 10 }} />

      <Text style={styles.version}>{t('profile.version')} 0.1.0 · {APP_NAME}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },

  error: { color: colors.danger, fontSize: 13, marginTop: 12 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: 'rgba(234,249,246,0.06)' },
  label: { color: colors.textDim, fontSize: 14 },
  value: { color: colors.text, fontSize: 14, fontWeight: '700' },
  sectionTitle: { color: colors.textDim, fontSize: 14, fontWeight: '700', marginTop: 20, marginBottom: 10 },
  langRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: 'rgba(234,249,246,0.06)' },
  langLabel: { color: colors.text, fontSize: 14 },
  langCheck: { color: colors.accent, fontWeight: '900' },
  version: { color: colors.textFaint, fontSize: 12, textAlign: 'center', marginTop: 24 }
});