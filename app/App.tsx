import React, { useEffect, useState } from 'react';
import { View, StatusBar, ActivityIndicator, StyleSheet, Text } from 'react-native';
import { MobileWalletProvider } from '@wallet-ui/react-native-web3js';
import { useMobileWallet } from '@wallet-ui/react-native-web3js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from './src/i18n';
import { API_URL, CHAIN, APP_NAME } from './src/config';
import { getStoredToken, clearStoredToken, getStoredWallet, clearStoredWallet, storeWallet, api } from './src/api';
import { useTranslation } from 'react-i18next';
import { colors } from './src/theme';
import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import CheckinScreen from './src/screens/CheckinScreen';
import PointsScreen from './src/screens/PointsScreen';
import InviteScreen from './src/screens/InviteScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import TabBar from './src/components/TabBar';

function MainShell({ onLogout, guest }) {
  const { t } = useTranslation();
  const [tab, setTab] = useState('home');

  const screens = {
    home: <HomeScreen />,
    checkin: <CheckinScreen />,
    points: <PointsScreen />,
    invite: <InviteScreen />,
    profile: <ProfileScreen onLogout={onLogout} />
  };

  return (
    <View style={styles.shell}>
      <View style={styles.glowA} pointerEvents="none" />
      <View style={styles.glowB} pointerEvents="none" />
      {guest ? (
        <View style={styles.guestBar}>
          <Text style={styles.guestText}>{t('login.guestHint')}</Text>
        </View>
      ) : null}
      <View style={styles.content}>{screens[tab]}</View>
      <TabBar active={tab} onChange={setTab} />
    </View>
  );
}

function Root() {
  const { account } = useMobileWallet();
  const [token, setToken] = useState<string | null>(null);
  const [guest, setGuest] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const lang = await AsyncStorage.getItem('solzero.lang');
        if (lang) await i18n.changeLanguage(lang);
      } catch {
        // ignore
      }
      const stored = await getStoredToken();
      setToken(stored);
      setChecking(false);
    })();
  }, []);

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        let storedWallet = await getStoredWallet();
        if (!storedWallet) {
          const me = await api('/me');
          storedWallet = (me && me.user && me.user.wallet) || null;
          if (storedWallet) await storeWallet(storedWallet);
        }
        const addr = account ? account.address : null;
        if (storedWallet && addr && addr !== storedWallet) {
          await clearStoredToken();
          await clearStoredWallet();
          setToken(null);
        }
      } catch {
        // ignore
      }
    })();
  }, [account, token]);

  function handleLogout() {
    clearStoredToken();
    clearStoredWallet();
    setToken(null);
    setGuest(false);
  }

  if (checking) {
    return (
      <View style={styles.splash}>
        <View style={styles.splashLogo}><Text style={styles.splashLogoText}>S</Text></View>
        <Text style={styles.splashName}>{APP_NAME}</Text>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
      </View>
    );
  }

  if (!token && !guest) {
    return (
      <LoginScreen
        onAuthed={(nextToken) => {
          setGuest(false);
          setToken(nextToken);
        }}
        onSkip={() => setGuest(true)}
      />
    );
  }

  return <MainShell onLogout={handleLogout} guest={guest} />;
}

export default function App() {
  return (
    <MobileWalletProvider
      chain={CHAIN}
      endpoint={API_URL + '/rpc'}
      identity={{ name: APP_NAME, uri: 'https://solzero.top' }}
    >
      <StatusBar barStyle="light-content" backgroundColor={colors.bgDeep} />
      <Root />
    </MobileWalletProvider>
  );
}

const styles = StyleSheet.create({
  shell: { flex: 1, backgroundColor: colors.bg },
  glowA: { position: 'absolute', width: 320, height: 320, borderRadius: 160, backgroundColor: 'rgba(95,216,200,0.06)', top: -90, right: -110 },
  glowB: { position: 'absolute', width: 360, height: 360, borderRadius: 180, backgroundColor: 'rgba(20,241,149,0.04)', bottom: -130, left: -130 },
  content: { flex: 1 },
  splash: { flex: 1, backgroundColor: colors.bgDeep, alignItems: 'center', justifyContent: 'center' },
  guestBar: { backgroundColor: 'rgba(234,249,246,0.05)', borderBottomWidth: 1, borderBottomColor: 'rgba(234,249,246,0.08)', paddingHorizontal: 16, paddingVertical: 8 },
  guestText: { color: colors.textDim, fontSize: 12, textAlign: 'center' },
  splashLogo: { width: 76, height: 76, borderRadius: 24, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  splashLogoText: { color: colors.accent, fontSize: 36, fontWeight: '900' },
  splashName: { color: colors.text, fontSize: 28, fontWeight: '900', marginTop: 12, letterSpacing: 2 }
});
