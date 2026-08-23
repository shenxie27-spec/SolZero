import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMobileWallet } from '@wallet-ui/react-native-web3js';
import { api, getSolPrice } from '../api';
import { scanWallet, buildCleanup, estimatePoints } from '../solana';
import { fmtSol, fmtUsd } from '../format';
import Button from '../components/Button';
import Card from '../components/Card';
import Stat from '../components/Stat';
import Header from '../components/Header';
import TokenIcon from '../components/TokenIcon';
import { colors, radius } from '../theme';

export default function HomeScreen({ onRefreshPoints }) {
  const { t } = useTranslation();
  const { account, signAndSendTransactions, connection } = useMobileWallet();
  const [scan, setScan] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [solUsd, setSolUsd] = useState(null);
  const [result, setResult] = useState(null);

  useEffect(() => {
    getSolPrice().then(setSolUsd);
  }, []);

  async function handleScan() {
    if (!account) {
      setError(t('home.needWallet'));
      return;
    }
    try {
      setScanning(true);
      setError(null);
      setResult(null);
      const data = await scanWallet(connection, account.address);
      setScan(data);
      setSelected(new Set([...data.empty, ...data.dust].map((i) => i.pubkey)));
    } catch (err) {
      setError(err.message);
    } finally {
      setScanning(false);
    }
  }

  const items = scan ? [...scan.empty, ...scan.dust] : [];
  const selectedItems = items.filter((i) => selected.has(i.pubkey));
  const recoveredLamports = selectedItems.reduce((sum, i) => sum + Number(i.lamports), 0);
  const feeLamports = Math.floor(recoveredLamports * 0.1);
  const netLamports = recoveredLamports - feeLamports;
  const estPoints = solUsd ? estimatePoints(recoveredLamports, solUsd) : null;

  function toggle(pubkey) {
    const next = new Set(selected);
    if (next.has(pubkey)) next.delete(pubkey);
    else next.add(pubkey);
    setSelected(next);
  }

  function toggleAll() {
    if (selectedItems.length === items.length) setSelected(new Set());
    else setSelected(new Set(items.map((i) => i.pubkey)));
  }

  async function handleExecute() {
    if (!account) {
      setError(t('home.needWallet'));
      return;
    }
    if (selectedItems.length === 0) return;
    const burnCount = selectedItems.filter((i) => i.kind === 'dust').length;
    const confirmed = await new Promise((resolvePromise) => {
      Alert.alert(t('home.confirmTitle'), t('home.confirmDesc', { count: selectedItems.length, burn: burnCount }), [
        { text: t('common.cancel'), style: 'cancel', onPress: () => resolvePromise(false) },
        { text: t('common.confirm'), onPress: () => resolvePromise(true) }
      ]);
    });
    if (!confirmed) return;

    try {
      setBusy(true);
      setError(null);
      const { blockhash } = await connection.getLatestBlockhash();
      const built = buildCleanup(account.address, selectedItems, blockhash);
      const signatures = await signAndSendTransactions(built.transactions);
      const report = await api('/cleanup/report', { method: 'POST', body: { signatures: Array.isArray(signatures) ? signatures : [signatures] } });
      setResult(report);
      if (onRefreshPoints) onRefreshPoints();
      handleScan();
    } catch (err) {
      setError(err.message || t('home.failed'));
    } finally {
      setBusy(false);
    }
  }

  function renderItem({ item }) {
    const isSelected = selected.has(item.pubkey);
    const isDust = item.kind === 'dust';
    return (
      <Pressable style={[styles.item, isSelected && styles.itemSelected]} onPress={() => toggle(item.pubkey)}>
        <View style={[styles.check, isSelected && styles.checkOn]}>{isSelected ? <Text style={styles.checkMark}>✓</Text> : null}</View>
        <TokenIcon mint={item.mint} size={34} />
        <View style={{ flex: 1 }}>
          <Text style={styles.itemTitle}>{isDust ? t('home.dustTitle') : t('home.emptyTitle')}</Text>
          <Text style={styles.itemSub} numberOfLines={1}>{item.pubkey}</Text>
        </View>
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={styles.itemValue}>+{fmtSol(item.lamports)} SOL</Text>
          {isDust ? <Text style={styles.itemDust}>{item.hasPrice ? fmtUsd(item.usdValue) : t('home.unknownValue')}</Text> : null}
        </View>
      </Pressable>
    );
  }

  if (!account) {
    return (
      <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
        <Header title={t('home.title')} subtitle={t('home.subtitle')} />
        <Card style={{ marginTop: 20, alignItems: 'center', paddingVertical: 36 }}>
          <View style={styles.lockBadge}><Text style={styles.lockBadgeText}>SOL</Text></View>
          <Text style={styles.emptyTitle}>{t('home.needWallet')}</Text>
          <Text style={styles.emptyDesc}>{t('login.guestHint')}</Text>
        </Card>
      </ScrollView>
    );
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
      <Header title={t('home.title')} subtitle={t('home.subtitle')} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {!scan ? (
        <Button title={t('home.scan')} onPress={handleScan} loading={scanning} variant="accent" style={{ marginTop: 20 }} />
      ) : items.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('home.nothing')}</Text>
          <Text style={styles.emptyDesc}>{t('home.nothingDesc')}</Text>
          <Button title={t('home.rescan')} onPress={handleScan} loading={scanning} variant="ghost" style={{ marginTop: 16 }} />
        </Card>
      ) : (
        <View>
          <Button title={t('home.execute')} onPress={handleExecute} loading={busy} disabled={selectedItems.length === 0} variant="accent" style={{ marginBottom: 16 }} />
          <View style={styles.tileRow}>
            <View style={styles.tile}>
              <Text style={styles.tileValue}>{scan.totals.emptyCount}</Text>
              <Text style={styles.tileLabel}>{t('home.emptyTitle')}</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileValue}>{scan.totals.dustCount}</Text>
              <Text style={styles.tileLabel}>{t('home.dustTitle')}</Text>
            </View>
            <View style={styles.tile}>
              <Text style={[styles.tileValue, { color: colors.accent }]}>{fmtSol(recoveredLamports)}</Text>
              <Text style={styles.tileLabel}>SOL</Text>
            </View>
          </View>

          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>{t('home.listTitle')}</Text>
            <Pressable onPress={toggleAll}>
              <Text style={styles.selectAll}>{selectedItems.length === items.length ? t('home.clearAll') : t('home.selectAll')}</Text>
            </Pressable>
          </View>
          <FlatList
            data={items}
            keyExtractor={(i) => i.pubkey}
            renderItem={renderItem}
            scrollEnabled={false}
          />

          <Card style={styles.summaryCard}>
            <Stat label={t('home.recovered')} value={`${fmtSol(recoveredLamports)} SOL` + (solUsd ? ` ≈ ${fmtUsd((recoveredLamports / 1e9) * solUsd)}` : '')} />
            <Stat label={t('home.serviceFee')} value={`${fmtSol(feeLamports)} SOL`} />
            <Stat label={t('home.youGet')} value={`${fmtSol(netLamports)} SOL`} valueColor={colors.accent} />
            <Stat label={t('home.estPoints')} value={estPoints === null ? '—' : `+${estPoints}`} valueColor={colors.gold} />
          </Card>



          {result ? (
            <Card style={{ marginTop: 16, borderColor: 'rgba(95,216,200,0.45)' }}>
              <Text style={styles.resultTitle}>{t('home.success')}</Text>
              <Text style={styles.resultDesc}>{t('home.successDesc')}</Text>
              <Text style={styles.resultPoints}>+{result.totalPoints} {t('common.points')}</Text>
            </Card>
          ) : null}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },
  error: { color: colors.danger, fontSize: 13, marginTop: 12 },
  lockBadge: {
    width: 52,
    height: 52,
    borderRadius: 16,
    backgroundColor: 'rgba(95,216,200,0.12)',
    borderWidth: 1,
    borderColor: 'rgba(95,216,200,0.4)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  lockBadgeText: { color: colors.primary, fontSize: 13, fontWeight: '900', letterSpacing: 1 },
  emptyCard: { marginTop: 20, alignItems: 'center', paddingVertical: 32 },
  emptyTitle: { color: colors.text, fontSize: 18, fontWeight: '700', marginTop: 12 },
  emptyDesc: { color: colors.textDim, fontSize: 13, marginTop: 6, textAlign: 'center', lineHeight: 19 },
  tileRow: { flexDirection: 'row', gap: 10, marginTop: 20 },
  tile: {
    flex: 1,
    backgroundColor: 'rgba(234,249,246,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(234,249,246,0.10)',
    borderRadius: radius,
    paddingVertical: 14,
    alignItems: 'center'
  },
  tileValue: { color: colors.text, fontSize: 22, fontWeight: '900' },
  tileLabel: { color: colors.textFaint, fontSize: 11, marginTop: 4 },
  listHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 18, marginBottom: 10 },
  sectionTitle: { color: colors.textDim, fontSize: 13, fontWeight: '700' },
  selectAll: { color: colors.accent, fontSize: 13, fontWeight: '700' },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234,249,246,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(234,249,246,0.10)',
    borderRadius: radius,
    padding: 14,
    marginBottom: 8,
    gap: 12
  },
  itemSelected: { borderColor: 'rgba(95,216,200,0.55)', backgroundColor: 'rgba(95,216,200,0.05)' },
  check: {
    width: 24,
    height: 24,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: colors.textFaint,
    alignItems: 'center',
    justifyContent: 'center'
  },
  checkOn: { backgroundColor: colors.accent, borderColor: colors.accent },
  checkMark: { color: '#06281C', fontWeight: '900', fontSize: 14 },
  itemTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  itemSub: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
  itemValue: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  itemDust: { color: colors.warn, fontSize: 11, marginTop: 2 },
  summaryCard: {
    marginTop: 12,
    backgroundColor: 'rgba(95,216,200,0.05)',
    borderColor: 'rgba(95,216,200,0.28)'
  },
  resultTitle: { color: colors.accent, fontSize: 16, fontWeight: '800' },
  resultDesc: { color: colors.textDim, fontSize: 13, marginTop: 4 },
  resultPoints: { color: colors.gold, fontSize: 20, fontWeight: '800', marginTop: 8 }
});

