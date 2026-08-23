import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMobileWallet } from '@wallet-ui/react-native-web3js';
import { api } from '../api';
import { buildCheckinTransaction } from '../../../core/src/index.js';
import Button from '../components/Button';
import Card from '../components/Card';
import Header from '../components/Header';
import { colors, radius } from '../theme';

export default function CheckinScreen({ onRefreshPoints }) {
  const { t } = useTranslation();
  const { account, signAndSendTransactions, connection } = useMobileWallet();
  const [status, setStatus] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [lastAward, setLastAward] = useState(null);

  async function load() {
    try {
      const data = await api('/checkin/status');
      setStatus(data);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function handleCheckin() {
    if (!account || !status) return;
    try {
      setBusy(true);
      setError(null);
      const { blockhash } = await connection.getLatestBlockhash();
      const built = buildCheckinTransaction({ owner: account.address, date: status.date, recentBlockhash: blockhash });
      const signature = await signAndSendTransactions(built.transaction);
      const report = await api('/checkin/report', { method: 'POST', body: { signature } });
      setLastAward(report);
      if (onRefreshPoints) onRefreshPoints();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const streak = status ? status.streak : 0;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
<Header title={t('checkin.title')} subtitle={t('checkin.desc')} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      {status ? (
        <Card style={{ marginTop: 20 }}>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>{t('checkin.date')}</Text>
            <Text style={styles.dateValue}>{status.date}</Text>
          </View>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>{t('checkin.streak')}</Text>
            <Text style={[styles.dateValue, { color: colors.gold }]}>{streak} {t('checkin.day')}</Text>
          </View>
          <View style={styles.ladderRow}>
            {status.ladder.map((v) => {
              const reached = v <= streak;
              const isToday = !status.alreadyDone && v === Math.min(streak + 1, 7);
              return (
                <View key={v} style={[styles.ladderCell, reached && styles.ladderReached, isToday && styles.ladderToday]}>
                  <Text style={[styles.ladderNum, (reached || isToday) && styles.ladderNumOn]}>{v}</Text>
                </View>
              );
            })}
          </View>
          <Text style={styles.ladderHint}>{t('checkin.ladderTitle')}</Text>
        </Card>
      ) : null}

      {lastAward ? (
        <Card style={{ marginTop: 16, borderColor: 'rgba(255,201,77,0.45)' }}>
          <Text style={styles.awardText}>{t('checkin.awarded', { points: lastAward.awarded })}</Text>
          <Text style={styles.awardStreak}>{t('checkin.streak')} {lastAward.streak} {t('checkin.day')}</Text>
        </Card>
      ) : null}

      <Button
        title={status && status.alreadyDone ? t('checkin.signed') : t('checkin.sign')}
        onPress={handleCheckin}
        loading={busy}
        disabled={!status || (status && status.alreadyDone)}
        variant="accent"
        style={{ marginTop: 20 }}
      />
      <Text style={styles.gasNote}>{t('checkin.gasNote')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },

  error: { color: colors.danger, fontSize: 13, marginTop: 12 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  dateLabel: { color: colors.textDim, fontSize: 14 },
  dateValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
  ladderRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14 },
  ladderCell: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: 'rgba(234,249,246,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(234,249,246,0.12)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  ladderReached: { backgroundColor: colors.gold, borderColor: colors.gold },
  ladderToday: { borderColor: colors.accent, borderWidth: 2 },
  ladderNum: { color: colors.textFaint, fontWeight: '800' },
  ladderNumOn: { color: '#1A1404' },
  ladderHint: { color: colors.textFaint, fontSize: 12, marginTop: 12, textAlign: 'center' },
  awardText: { color: colors.gold, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  awardStreak: { color: colors.textDim, fontSize: 13, marginTop: 6, textAlign: 'center' },
  gasNote: { color: colors.textFaint, fontSize: 12, marginTop: 12, textAlign: 'center' }
});
