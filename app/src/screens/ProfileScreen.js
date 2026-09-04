import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Alert, Pressable } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Clipboard from '@react-native-clipboard/clipboard';
import i18n from '../i18n';
import { api, clearStoredToken } from '../api';
import { shortWallet, fmtPointsNum } from '../format';
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
  const [blockedList, setBlockedList] = useState([]);
  const [blockedMeta, setBlockedMeta] = useState({});
  const [copied, setCopied] = useState(false);

  async function load() {
    try {
      const data = await api('/me');
      setMe(data);
      const b = await api('/me/blocked');
      setBlockedList(b.mints || []);
      if (b.mints && b.mints.length > 0) {
        const tok = await api('/tokens?mints=' + encodeURIComponent(b.mints.join(',')), { auth: false });
        setBlockedMeta(tok.tokens || {});
      } else {
        setBlockedMeta({});
      }
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

  async function unblock(mint) {
    try {
      await api('/blocked/' + mint, { method: 'DELETE' });
      setBlockedList((prev) => prev.filter((m) => m !== mint));
    } catch (err) {
      setError(err.message);
    }
  }

  function copyEmail() {
    Clipboard.setString('shenxie27@gmail.com');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
          <Text style={[styles.value, { color: colors.gold }]}>{me ? fmtPointsNum(me.user.points) : '—'}</Text>
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

      <Text style={styles.sectionTitle}>{t('profile.blockedTitle')}</Text>
      <Card>
        {blockedList.length === 0 ? (
          <Text style={styles.empty}>{t('profile.blockedEmpty')}</Text>
        ) : (
          blockedList.map((mint) => {
            const m = blockedMeta[mint] || null;
            return (
              <View key={mint} style={styles.langRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.langLabel}>{m && m.symbol ? m.symbol : shortWallet(mint)}</Text>
                  <Text style={styles.blockedMint}>{shortWallet(mint)}</Text>
                </View>
                <Pressable style={styles.unblockBtn} onPress={() => unblock(mint)}>
                  <Text style={styles.unblockText}>{t('profile.unblock')}</Text>
                </Pressable>
              </View>
            );
          })
        )}
      </Card>

      <Text style={styles.sectionTitle}>{t('profile.feedbackTitle')}</Text>
      <Card>
        <Text style={styles.feedbackDesc}>{t('profile.feedbackDesc')}</Text>
        <Pressable style={styles.emailRow} onPress={copyEmail}>
          <Text style={styles.emailText}>shenxie27@gmail.com</Text>
          <Text style={styles.copyText}>{copied ? t('common.copied') : t('common.copy')}</Text>
        </Pressable>
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
  empty: { color: colors.textFaint, fontSize: 13, paddingVertical: 8 },
  blockedMint: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
  unblockBtn: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(95,216,200,0.45)' },
  unblockText: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  feedbackDesc: { color: colors.textFaint, fontSize: 12, lineHeight: 17 },
  emailRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10 },
  emailText: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  copyText: { color: colors.textDim, fontSize: 12 },
  version: { color: colors.textFaint, fontSize: 12, textAlign: 'center', marginTop: 24 }
});
