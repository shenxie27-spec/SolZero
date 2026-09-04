import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMobileWallet } from '@wallet-ui/react-native-web3js';
import { api } from '../api';
import { buildCheckinTransaction, buildTaskTransaction } from '../../../core/src/index.js';
import { simulateTransactions } from '../solana';
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
  const [task, setTask] = useState(null);
  const [taskBusy, setTaskBusy] = useState(false);
  const [taskAward, setTaskAward] = useState(null);

  async function load() {
    try {
      const data = await api('/checkin/status');
      setStatus(data);
      const taskData = await api('/task/status');
      setTask(taskData);
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
      await simulateTransactions([built.transaction]);
      const signed = await signAndSendTransactions(built.transaction);
      const signature = Array.isArray(signed) ? signed[0] : signed;
      let report = null;
      for (let attempt = 0; attempt < 4 && !report; attempt += 1) {
        try {
          report = await api('/checkin/report', { method: 'POST', body: { signature } });
        } catch (err) {
          if ((err.status === 404 || err.status === 502) && attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, 3500));
          } else {
            throw err;
          }
        }
      }
      setLastAward(report);
      if (onRefreshPoints) onRefreshPoints();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleClaimTask() {
    if (!account || !task) return;
    try {
      setTaskBusy(true);
      setError(null);
      const { blockhash } = await connection.getLatestBlockhash();
      const built = buildTaskTransaction({ owner: account.address, date: task.date, recentBlockhash: blockhash });
      await simulateTransactions([built.transaction]);
      const signed = await signAndSendTransactions(built.transaction);
      const signature = Array.isArray(signed) ? signed[0] : signed;
      let report = null;
      for (let attempt = 0; attempt < 4 && !report; attempt += 1) {
        try {
          report = await api('/task/claim', { method: 'POST', body: { signature } });
        } catch (err) {
          if ((err.status === 404 || err.status === 502) && attempt < 3) {
            await new Promise((resolve) => setTimeout(resolve, 3500));
          } else {
            throw err;
          }
        }
      }
      setTaskAward(report);
      if (onRefreshPoints) onRefreshPoints();
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setTaskBusy(false);
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

      {task ? (
        <Card style={{ marginTop: 24, borderColor: 'rgba(255,201,77,0.35)' }}>
          <View style={styles.dateRow}>
            <Text style={styles.dateLabel}>{t('task.title')}</Text>
            <Text style={[styles.dateValue, { color: colors.gold }]}>+{task.reward}</Text>
          </View>
          <Text style={styles.taskDesc}>{t('task.desc')}</Text>
          <View style={styles.taskRow}>
            <Text style={styles.taskStatus}>{t('task.step1')}</Text>
            <Text style={[styles.taskStatus, task.cleanupDone && styles.taskDone]}>{task.cleanupDone ? t('common.done') : t('common.todo')}</Text>
          </View>
          <View style={styles.taskRow}>
            <Text style={styles.taskStatus}>{t('task.step2')}</Text>
            <Text style={[styles.taskStatus, task.claimed && styles.taskDone]}>{task.claimed ? t('common.done') : t('common.todo')}</Text>
          </View>
          {taskAward ? (
            <Text style={styles.taskAward}>{t('task.awarded', { points: taskAward.awarded })}</Text>
          ) : null}
          <Button
            title={task.claimed ? t('task.claimed') : t('task.claim')}
            onPress={handleClaimTask}
            loading={taskBusy}
            disabled={!task.cleanupDone || task.claimed}
            variant="accent"
            style={{ marginTop: 14 }}
          />
          <Text style={styles.gasNote}>{t('task.gasNote')}</Text>
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },

  error: { color: colors.danger, fontSize: 13, marginTop: 12 },
  dateRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  taskDesc: { color: colors.textDim, fontSize: 13, lineHeight: 19, marginTop: 4 },
  taskRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, marginTop: 4 },
  taskStatus: { color: colors.textFaint, fontSize: 13 },
  taskDone: { color: colors.accent, fontWeight: '700' },
  taskAward: { color: colors.gold, fontSize: 15, fontWeight: '800', marginTop: 10 },
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
