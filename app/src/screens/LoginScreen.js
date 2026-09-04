import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, StyleSheet, SafeAreaView, ScrollView, Pressable, Animated, Easing } from 'react-native';
import { useTranslation } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMobileWallet } from '@wallet-ui/react-native-web3js';
import i18n from '../i18n';
import { api, storeToken, storeWallet } from '../api';

function withTimeout(promise, ms, message) {
  return Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(message)), ms))
  ]);
}
import { encodeSignature } from '../solana';
import Button from '../components/Button';
import { colors, radius } from '../theme';

const LANGS = [
  { key: 'zh', label: '中文' },
  { key: 'en', label: 'English' },
  { key: 'ja', label: '日本語' },
  { key: 'ko', label: '한국어' }
];

function FadeReveal({ delay, children }) {
  const anim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(anim, {
      toValue: 1,
      duration: 750,
      delay,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true
    }).start();
  }, [anim, delay]);
  const fade = anim.interpolate({ inputRange: [0, 1], outputRange: [0, 1] });
  const rise = anim.interpolate({ inputRange: [0, 1], outputRange: [16, 0] });
  return (
    <Animated.View style={{ opacity: fade, transform: [{ translateY: rise }] }}>{children}</Animated.View>
  );
}

export default function LoginScreen({ onAuthed, onSkip }) {
  const { t } = useTranslation();
  const { account, connect, signMessages } = useMobileWallet();
  const [inviteCode, setInviteCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function changeLang(key) {
    try {
      await i18n.changeLanguage(key);
      await AsyncStorage.setItem('solzero.lang', key);
    } catch (err) {
      // ignore
    }
  }

  async function handleConnect() {
    try {
      setBusy(true);
      setError(null);
      const walletAccount = account || (await withTimeout(connect(), 45000, t('login.walletTimeout')));
      const wallet = walletAccount ? walletAccount.address : null;
      if (!wallet) throw new Error(t('login.failed'));
      const challenge = await api('/auth/challenge', { auth: false, method: 'POST', body: { wallet } });
      const signatureBytes = await withTimeout(signMessages(new TextEncoder().encode(challenge.message)), 120000, t('login.walletTimeout'));
      const signature = encodeSignature(signatureBytes);
      const auth = await api('/auth/verify', {
        auth: false,
        method: 'POST',
        body: { wallet, nonce: challenge.nonce, signature, inviteCode: inviteCode.trim().toUpperCase() || undefined }
      });
      await storeToken(auth.token);
      await storeWallet(wallet);
      onAuthed(auth.token);
    } catch (err) {
      const msg = (err && err.message) || '';
      if (/Network request failed|Failed to fetch|Load failed/i.test(msg)) {
        setError(t('login.networkError'));
      } else {
        setError(msg || t('login.failed'));
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.glowA} pointerEvents="none" />
      <View style={styles.glowB} pointerEvents="none" />
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <FadeReveal delay={120}>
          <View style={styles.langBar}>
            {LANGS.map((lang) => {
              const isActive = i18n.language === lang.key;
              return (
                <Pressable
                  key={lang.key}
                  onPress={() => changeLang(lang.key)}
                  style={[styles.langChip, isActive && styles.langChipActive]}
                >
                  <Text style={[styles.langChipText, isActive && styles.langChipTextActive]}>{lang.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </FadeReveal>

        <View style={styles.hero}>
          <FadeReveal delay={320}>
            <Text style={styles.brand}>
              Sol<Text style={styles.brandAccent}>Zero</Text>
            </Text>
          </FadeReveal>
          <FadeReveal delay={500}>
            <View style={styles.brandLine} />
          </FadeReveal>
          <FadeReveal delay={660}>
            <Text style={styles.title}>{t('login.title')}</Text>
          </FadeReveal>
          <FadeReveal delay={820}>
            <Text style={styles.subtitle}>{t('login.subtitle')}</Text>
          </FadeReveal>
        </View>

        <FadeReveal delay={1000}>
          <View style={styles.inviteBox}>
            <Text style={styles.inviteLabel}>{t('login.inviteLabel')}</Text>
            <TextInput
              style={styles.input}
              value={inviteCode}
              onChangeText={(v) => setInviteCode(v.toUpperCase())}
              placeholder={t('login.invitePlaceholder')}
              placeholderTextColor={colors.textFaint}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={8}
            />
            <Text style={styles.inviteHint}>{t('login.inviteOptional')}</Text>
          </View>
        </FadeReveal>

        {error ? <Text style={styles.error}>{error}</Text> : null}
        <FadeReveal delay={1150}>
          <Button title={t('login.connect')} onPress={handleConnect} loading={busy} style={styles.connect} />
        </FadeReveal>
        <FadeReveal delay={1280}>
          <Button title={t('login.skip')} onPress={onSkip} variant="ghost" style={styles.skip} />
        </FadeReveal>
        <FadeReveal delay={1400}>
          <Text style={styles.agree}>{t('login.agree')}</Text>
        </FadeReveal>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.bgDeep },
  container: { flexGrow: 1, padding: 24, paddingTop: 16, paddingBottom: 28, justifyContent: 'center' },
  glowA: {
    position: 'absolute',
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: 'rgba(95,216,200,0.07)',
    top: -90,
    right: -110
  },
  glowB: {
    position: 'absolute',
    width: 360,
    height: 360,
    borderRadius: 180,
    backgroundColor: 'rgba(20,241,149,0.05)',
    bottom: -130,
    left: -130
  },
  langBar: { flexDirection: 'row', justifyContent: 'center', gap: 8, marginBottom: 24 },
  langChip: {
    paddingHorizontal: 12,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(234,249,246,0.12)',
    backgroundColor: 'rgba(234,249,246,0.04)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  langChipActive: {
    backgroundColor: 'rgba(95,216,200,0.14)',
    borderColor: 'rgba(95,216,200,0.55)'
  },
  langChipText: { color: colors.textDim, fontSize: 12, fontWeight: '600' },
  langChipTextActive: { color: colors.primary, fontWeight: '800' },

  hero: { alignItems: 'center', marginBottom: 26 },
  brand: { color: colors.text, fontSize: 32, fontWeight: '900', letterSpacing: 3 },
  brandAccent: { color: colors.primary },
  brandLine: { width: 44, height: 2, borderRadius: 1, backgroundColor: 'rgba(95,216,200,0.6)', marginTop: 12, marginBottom: 16 },
  title: { color: colors.text, fontSize: 16, fontWeight: '700', textAlign: 'center' },
  subtitle: { color: colors.textDim, fontSize: 13, textAlign: 'center', marginTop: 10, lineHeight: 20 },

  inviteBox: {
    backgroundColor: 'rgba(234,249,246,0.04)',
    borderWidth: 1,
    borderColor: 'rgba(234,249,246,0.10)',
    borderRadius: radius + 2,
    padding: 16,
    marginBottom: 16
  },
  inviteLabel: { color: colors.textDim, fontSize: 13, marginBottom: 8 },
  input: {
    backgroundColor: 'rgba(10,16,18,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(234,249,246,0.12)',
    borderRadius: radius,
    color: colors.text,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 3,
    paddingHorizontal: 16,
    height: 52
  },
  inviteHint: { color: colors.textFaint, fontSize: 12, marginTop: 8, lineHeight: 17 },
  error: { color: colors.danger, fontSize: 13, marginBottom: 12, textAlign: 'center' },
  connect: { marginBottom: 12 },
  skip: { marginBottom: 16 },
  agree: { color: colors.textFaint, fontSize: 11, textAlign: 'center', lineHeight: 16 }
});
