import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Share } from 'react-native';
import { useTranslation } from 'react-i18next';
import Clipboard from '@react-native-clipboard/clipboard';
import { api } from '../api';
import { reportError } from '../errors';
import { shortWallet, fmtPointsNum } from '../format';
import Button from '../components/Button';
import Card from '../components/Card';
import Header from '../components/Header';
import { colors } from '../theme';

export default function InviteScreen() {
  const { t } = useTranslation();
  const [me, setMe] = useState(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const data = await api('/me');
      setMe(data);
    } catch (err) {
      reportError('invite', err);
      setError(err.message);
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function copyCode() {
    if (!me) return;
    Clipboard.setString(me.user.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  async function shareInvite() {
    if (!me) return;
    try {
      await Share.share({ message: t('invite.shareText', { code: me.user.code }) });
    } catch (err) {
      // user cancelled
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={{ padding: 20, paddingBottom: 40 }}>
<Header title={t('invite.title')} subtitle={t('invite.desc')} />

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <Card style={styles.codeCard}>
        <Text style={styles.codeLabel}>{t('invite.myCode')}</Text>
        <Text style={styles.codeValue}>{me ? me.user.code : '—'}</Text>
        <View style={styles.codeActions}>
          <Button title={copied ? t('common.copied') : t('invite.copyCode')} onPress={copyCode} variant="ghost" style={{ flex: 1 }} />
          <Button title={t('invite.shareInvite')} onPress={shareInvite} variant="accent" style={{ flex: 1, marginLeft: 10 }} />
        </View>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <View style={styles.ruleRow}>
          <View style={styles.ruleIcon}><Text style={styles.ruleNum}>1</Text></View>
          <Text style={styles.ruleText}>{t('invite.rule1')}</Text>
        </View>
        <View style={styles.ruleRow}>
          <View style={styles.ruleIcon}><Text style={styles.ruleNum}>2</Text></View>
          <Text style={styles.ruleText}>{t('invite.rule2')}</Text>
        </View>
        <View style={styles.ruleRow}>
          <View style={styles.ruleIcon}><Text style={styles.ruleNum}>3</Text></View>
          <Text style={styles.ruleText}>{t('invite.rule3')}</Text>
        </View>
      </Card>

      <Card style={{ marginTop: 16 }}>
        <View style={styles.earnedRow}>
          <Text style={styles.earnedLabel}>{t('invite.earned')}</Text>
          <Text style={styles.earnedValue}>{me ? fmtPointsNum(me.invites.earned) : '—'}</Text>
        </View>
      </Card>

      <Text style={styles.sectionTitle}>{t('invite.downlines')}</Text>
      {me && me.invites.l1.length === 0 && me.invites.l2.length === 0 ? (
        <Card>
          <Text style={styles.empty}>{t('invite.emptyDownlines')}</Text>
        </Card>
      ) : null}

      {me && me.invites.l1.length > 0 ? (
        <Card>
          <Text style={styles.listTitle}>{t('invite.l1')} · {t('invite.l1Desc')}</Text>
          {me.invites.l1.map((u) => (
            <View key={u.id} style={styles.row}>
              <Text style={styles.rowWallet}>{shortWallet(u.wallet)}</Text>
              <Text style={styles.rowPoints}>{fmtPointsNum(u.points)}</Text>
            </View>
          ))}
        </Card>
      ) : null}

      {me && me.invites.l2.length > 0 ? (
        <Card style={{ marginTop: 12 }}>
          <Text style={styles.listTitle}>{t('invite.l2')} · {t('invite.l2Desc')}</Text>
          {me.invites.l2.map((u) => (
            <View key={u.id} style={styles.row}>
              <Text style={styles.rowWallet}>{shortWallet(u.wallet)}</Text>
              <Text style={styles.rowPoints}>{fmtPointsNum(u.points)}</Text>
            </View>
          ))}
        </Card>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: 'transparent' },

  error: { color: colors.danger, fontSize: 13, marginTop: 12 },
  codeCard: { marginTop: 20, alignItems: 'center', paddingVertical: 24, backgroundColor: 'rgba(95,216,200,0.05)', borderColor: 'rgba(95,216,200,0.28)' },
  codeLabel: { color: colors.textDim, fontSize: 13 },
  codeValue: { color: colors.text, fontSize: 34, fontWeight: '900', letterSpacing: 6, marginTop: 8 },
  codeActions: { flexDirection: 'row', marginTop: 16, alignSelf: 'stretch' },
  ruleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 7 },
  ruleIcon: { width: 20, height: 20, borderRadius: 10, backgroundColor: colors.cardAlt, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center' },
  ruleNum: { color: colors.accent, fontSize: 11, fontWeight: '800' },
  ruleText: { color: colors.textDim, fontSize: 13, flex: 1, lineHeight: 18 },
  earnedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  earnedLabel: { color: colors.textDim, fontSize: 14 },
  earnedValue: { color: colors.gold, fontSize: 18, fontWeight: '800' },
  sectionTitle: { color: colors.textDim, fontSize: 14, fontWeight: '700', marginTop: 22, marginBottom: 10 },
  empty: { color: colors.textFaint, fontSize: 13, textAlign: 'center', paddingVertical: 10 },
  listTitle: { color: colors.text, fontSize: 14, fontWeight: '700', marginBottom: 6 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: 'rgba(234,249,246,0.06)' },
  rowWallet: { color: colors.text, fontSize: 14 },
  rowPoints: { color: colors.gold, fontSize: 14, fontWeight: '700' }
});
