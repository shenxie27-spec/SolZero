import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { api } from '../api';
import { fmtPointsNum } from '../format';
import Card from '../components/Card';
import Header from '../components/Header';
import { colors } from '../theme';

function kindLabel(t, kind) {
  const map = {
    checkin: t('points.kindCheckin'),
    cleanup: t('points.kindCleanup'),
    referral_l1: t('points.kindReferralL1'),
    referral_l2: t('points.kindReferralL2'),
    adjust: t('points.kindAdjust')
  };
  return map[kind] || kind;
}

export default function PointsScreen() {
  const { t } = useTranslation();
  const [me, setMe] = useState(null);
  const [history, setHistory] = useState([]);
  const [board, setBoard] = useState([]);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const [meData, historyData, boardData] = await Promise.all([
        api('/me'),
        api('/me/points'),
        api('/leaderboard', { auth: false })
      ]);
      setMe(meData);
      setHistory(historyData.rows || []);
      setBoard(boardData.rows || []);
    } catch (err) {
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
<Header title={t('points.title')} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Card style={styles.balanceCard}>
        <Text style={styles.balanceLabel}>{t('points.balance')}</Text>
        <Text style={styles.balanceValue}>{me ? fmtPointsNum(me.user.points) : '—'}</Text>
        <Text style={styles.welfare}>{t('points.moreWelfare')}</Text>
        <Text style={styles.welfareHint}>{t('points.welfareHint')}</Text>
      </Card>

      <Text style={styles.sectionTitle}>{t('points.history')}</Text>
      <Card>
        {history.length === 0 ? (
          <Text style={styles.empty}>{t('points.noHistory')}</Text>
        ) : (
          history.map((row) => (
            <View key={row.id} style={styles.row}>
              <View>
                <Text style={styles.rowKind}>{kindLabel(t, row.kind)}</Text>
                <Text style={styles.rowTime}>{row.createdAt}</Text>
              </View>
              <Text style={[styles.rowAmount, row.amount >= 0 ? { color: colors.accent } : { color: colors.danger }]}>
                {row.amount >= 0 ? '+' : ''}{row.amount}
              </Text>
            </View>
          ))
        )}
      </Card>

      <Text style={styles.sectionTitle}>{t('points.leaderboard')}</Text>
      <Card>
        {board.slice(0, 10).map((row) => (
          <View key={row.rank} style={styles.row}>
            <Text style={styles.rank}>#{row.rank}</Text>
            <Text style={styles.boardWallet}>{row.wallet}</Text>
            <Text style={styles.boardPoints}>{row.points}</Text>
          </View>
        ))}
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },

  error: { color: colors.danger, fontSize: 13, marginTop: 12 },
  balanceCard: { marginTop: 16, alignItems: 'center', paddingVertical: 28, backgroundColor: 'rgba(95,216,200,0.05)', borderColor: 'rgba(95,216,200,0.28)' },
  balanceLabel: { color: colors.textDim, fontSize: 13 },
  balanceValue: { color: colors.gold, fontSize: 44, fontWeight: '900', marginTop: 4 },
  welfare: { color: colors.accent, fontSize: 14, fontWeight: '700', marginTop: 14 },
  welfareHint: { color: colors.textFaint, fontSize: 12, marginTop: 6, textAlign: 'center' },
  sectionTitle: { color: colors.textDim, fontSize: 14, fontWeight: '700', marginTop: 22, marginBottom: 10 },
  empty: { color: colors.textFaint, fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: 1, borderBottomColor: 'rgba(234,249,246,0.06)' },
  rowKind: { color: colors.text, fontSize: 14 },
  rowTime: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
  rowAmount: { fontSize: 15, fontWeight: '800' },
  rank: { color: colors.textFaint, width: 44, fontWeight: '700' },
  boardWallet: { color: colors.text, flex: 1, fontSize: 14 },
  boardPoints: { color: colors.gold, fontSize: 14, fontWeight: '800' }
});
