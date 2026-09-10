import React, { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Modal, ScrollView, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useMobileWallet } from '@wallet-ui/react-native-web3js';
import { api, getSolPrice } from '../api';
import { reportError } from '../errors';
import { scanWallet, buildCleanup, estimatePoints, fetchTokenMeta, simulateTransactions, fetchCnfAssets, fetchCnfProof } from '../solana';
import { buildCnfBurnInstruction, buildCnfBurnTransactions, fetchCnfTreeVersion, CNF_BURN_FEE_LAMPORTS, CNF_BURN_POINTS } from '../../../core/src/index.js';
import { fmtSol, fmtUsd, fmtAmount, shortWallet, fmtAddress } from '../format';
import Button from '../components/Button';
import Card from '../components/Card';
import Stat from '../components/Stat';
import Header from '../components/Header';
import TokenIcon from '../components/TokenIcon';
import { colors, radius } from '../theme';
import { TREASURY, API_URL } from '../config';

function CnfIcon({ uri, size = 34 }) {
  const [failed, setFailed] = useState(false);
  if (uri && !failed) {
    return (
      <Image
        source={{ uri: `${API_URL}/api/img?url=${encodeURIComponent(uri)}` }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: 'rgba(95,216,200,0.08)', borderWidth: 1, borderColor: 'rgba(234,249,246,0.18)' }}
        onError={() => setFailed(true)}
      />
    );
  }
  return (
    <View style={[styles.cnfFallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={{ color: colors.accent, fontSize: Math.round(size * 0.32), fontWeight: '800' }}>NFT</Text>
    </View>
  );
}

function fmtPoints(n) {
  if (!Number.isFinite(n)) return '—';
  return Number.isInteger(n) ? String(n) : n.toFixed(1);
}

function fmtLastUsed(ts) {
  if (!ts) return null;
  const d = new Date(ts * 1000);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export default function HomeScreen({ onRefreshPoints }) {
  const { t } = useTranslation();
  const { account, signAndSendTransactions, connection } = useMobileWallet();
  const [scan, setScan] = useState(null);
  const [meta, setMeta] = useState({});
  const [lastUsed, setLastUsed] = useState({});
  const [blocked, setBlocked] = useState(new Set());
  const [cleanable, setCleanable] = useState(new Set());
  const [selected, setSelected] = useState(new Set());
  const [activeTab, setActiveTab] = useState('tokens');
  const [scanning, setScanning] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [solUsd, setSolUsd] = useState(null);
  const [result, setResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cnfAssets, setCnfAssets] = useState([]);
  const [cnfSelected, setCnfSelected] = useState(new Set());
  const [cnfLoading, setCnfLoading] = useState(false);
  const [cnfVersions, setCnfVersions] = useState({});

  useEffect(() => {
    getSolPrice().then(setSolUsd);
    api('/me/blocked').then((r) => setBlocked(new Set(r.mints || []))).catch(() => {});
    api('/me/cleanable').then((r) => setCleanable(new Set(r.mints || []))).catch(() => {});
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
      const whitelistedUnknown = (data.unknown || []).filter((i) => cleanable.has(i.mint));
      setSelected(new Set([...data.empty, ...data.dust, ...whitelistedUnknown]
        .filter((i) => !blocked.has(i.mint))
        .map((i) => i.pubkey)));
      setActiveTab('tokens');
      setLastUsed({});
      api('/me/blocked').then((r) => setBlocked(new Set(r.mints || []))).catch(() => {});
      api('/me/cleanable').then((r) => setCleanable(new Set(r.mints || []))).catch(() => {});
      const mints = [...data.empty, ...data.dust, ...(data.unknown || [])].map((i) => i.mint);
      fetchTokenMeta(mints).then(setMeta).catch(() => {});
      const pubs = [...data.empty, ...data.dust, ...(data.unknown || [])].map((i) => i.pubkey);
      if (pubs.length > 0) {
        fetch(`${API_URL}/api/activity?accounts=${encodeURIComponent(pubs.join(','))}`)
          .then((r) => r.json())
          .then((j) => setLastUsed((j && j.activity) || {}))
          .catch(() => {});
      }
      setCnfLoading(true);
      fetchCnfAssets(account.address)
        .then((list) => {
          setCnfAssets(list);
          setCnfSelected(new Set());
          setCnfVersions({});
          Promise.all(list.map(async (a) => {
            try {
              const v = await fetchCnfTreeVersion(connection, a);
              return [a.id, v];
            } catch (err) {
              return [a.id, 'unknown'];
            }
          })).then((pairs) => {
            const map = {};
            for (const [id, v] of pairs) map[id] = v;
            setCnfVersions(map);
          }).catch(() => {});
        })
        .catch(() => {})
        .finally(() => setCnfLoading(false));
    } catch (err) {
      reportError('home.scan', err);
      setError(err.message);
    } finally {
      setScanning(false);
    }
  }

  const whitelistedUnknown = scan
    ? (scan.unknown || []).filter((i) => cleanable.has(i.mint) && !blocked.has(i.mint))
    : [];
  const items = scan
    ? [...scan.empty, ...scan.dust, ...whitelistedUnknown].filter((i) => !blocked.has(i.mint))
    : [];
  const unpriced = scan ? (scan.unknown || []).filter((i) => !cleanable.has(i.mint)) : [];
  const blockedInScan = scan
    ? [...scan.empty, ...scan.dust, ...(scan.unknown || [])].filter((i) => blocked.has(i.mint)).length
    : 0;
  const hiddenTotal = unpriced.length + blockedInScan;
  const selectedItems = items.filter((i) => selected.has(i.pubkey));
  const selectedCnf = cnfAssets.filter((a) => cnfSelected.has(a.id));
  const allSelected = [...selectedItems];
  const recoveredLamports = allSelected.reduce((sum, i) => sum + Number(i.lamports), 0);
  const feeLamports = Math.floor(recoveredLamports * 0.1);
  const cnfFeeLamports = selectedCnf.length * CNF_BURN_FEE_LAMPORTS;
  const netLamports = Math.max(0, recoveredLamports - feeLamports - cnfFeeLamports);
  const basePoints = solUsd ? estimatePoints(recoveredLamports, solUsd) : 0;
  const estPoints = basePoints + selectedCnf.length * CNF_BURN_POINTS;

  function toggle(pubkey) {
    const next = new Set(selected);
    if (next.has(pubkey)) next.delete(pubkey);
    else next.add(pubkey);
    setSelected(next);
  }

  function toggleAllLeft() {
    const leftKeys = items.map((i) => i.pubkey);
    const allPicked = leftKeys.length > 0 && leftKeys.every((k) => selected.has(k));
    if (allPicked) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map((i) => i.pubkey)));
    }
  }

  function toggleAllCnf() {
    const supported = cnfAssets.filter((a) => cnfVersions[a.id] !== 'v2');
    const allPicked = supported.length > 0 && supported.every((a) => cnfSelected.has(a.id));
    if (allPicked) setCnfSelected(new Set());
    else setCnfSelected(new Set(supported.map((a) => a.id)));
  }

  function toggleCnf(id) {
    if (cnfVersions[id] === 'v2') return;
    const next = new Set(cnfSelected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setCnfSelected(next);
  }

  function blockMint(mint) {
    const next = new Set(blocked);
    next.add(mint);
    setBlocked(next);
    const pubkeys = scan
      ? [...scan.empty, ...scan.dust, ...(scan.unknown || [])].filter((i) => i.mint === mint).map((i) => i.pubkey)
      : [];
    setSelected((prev) => {
      const n = new Set(prev);
      pubkeys.forEach((p) => n.delete(p));
      return n;
    });
    api('/blocked', { method: 'POST', body: { mint } }).catch(() => {});
  }

  function burnSummary() {
    const groups = [];
    const byKey = new Map();
    for (const it of allSelected) {
      if (it.kind === 'empty') continue;
      const symbol = (meta[it.mint] && meta[it.mint].symbol) || null;
      const key = symbol || it.mint;
      let g = byKey.get(key);
      if (!g) {
        g = { symbol, mint: it.mint, count: 0, totalUi: 0, hasUnknown: false };
        byKey.set(key, g);
        groups.push(g);
      }
      g.count += 1;
      g.totalUi += Number(it.amountUi || 0);
      if (it.kind === 'unknown') g.hasUnknown = true;
    }
    return groups;
  }

  function handleExecute() {
    if (!account) {
      setError(t('home.needWallet'));
      return;
    }
    if (allSelected.length === 0 && selectedCnf.length === 0) return;
    setConfirmOpen(true);
  }

  async function runCleanup() {
    setConfirmOpen(false);
    try {
      setBusy(true);
      setError(null);
      const { blockhash } = await connection.getLatestBlockhash();
      const built = allSelected.length > 0
        ? buildCleanup(account.address, allSelected, blockhash)
        : { transactions: [], breakdown: null };

      const cnfInstructions = [];
      const burnableCnf = selectedCnf.filter((a) => cnfVersions[a.id] !== 'v2');
      for (const asset of burnableCnf) {
        try {
          const proofData = await fetchCnfProof(asset.id);
          cnfInstructions.push(buildCnfBurnInstruction({ owner: account.address, asset, proofData }));
        } catch (err) {
          const name = (asset.content && asset.content.metadata && asset.content.metadata.name) || shortWallet(asset.id);
          throw new Error(t('home.cnfProofFailed', { name }));
        }
      }
      const cnfBuilt = cnfInstructions.length > 0
        ? buildCnfBurnTransactions({ owner: account.address, instructions: cnfInstructions, recentBlockhash: blockhash })
        : { transactions: [], burnCounts: [] };
      const allTxs = [...built.transactions, ...cnfBuilt.transactions];

      try {
        await simulateTransactions(allTxs);
      } catch (err) {
        throw new Error(t('home.simFailed', { detail: err.message || String(err) }));
      }

      const signatures = await signAndSendTransactions(allTxs);
      const sigList = Array.isArray(signatures) ? signatures : [signatures];
      const tokenSigs = sigList.slice(0, built.transactions.length);
      const cnfSigs = sigList.slice(built.transactions.length).map((sig, i) => ({
        sig,
        burns: cnfBuilt.burnCounts[i] || 0
      }));
      const report = await api('/cleanup/report', {
        method: 'POST',
        body: { signatures: tokenSigs, cnfSignatures: cnfSigs }
      });
      setResult({ ...report, cnfOnly: built.transactions.length === 0 });
      if (onRefreshPoints) onRefreshPoints();
      handleScan();
    } catch (err) {
      const msg = String((err && err.message) || err || '');
      if (/AccountNotFound|not found/i.test(msg)) {
        setError(t('home.accountsChanged'));
        setTimeout(() => handleScan(), 1500);
      } else {
        setError(msg || t('home.failed'));
      }
      reportError('home.cleanup', err);
    } finally {
      setBusy(false);
    }
  }

  const summary = burnSummary();
  const burnCount = allSelected.filter((i) => i.kind !== 'empty').length;

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
      ) : items.length === 0 && unpriced.length === 0 && !cnfLoading && cnfAssets.length === 0 ? (
        <Card style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>{t('home.nothing')}</Text>
          <Text style={styles.emptyDesc}>{t('home.nothingDesc')}</Text>
          <Button title={t('home.rescan')} onPress={handleScan} loading={scanning} variant="ghost" style={{ marginTop: 16 }} />
        </Card>
      ) : (
        <View>
          <Button title={t('home.execute')} onPress={handleExecute} loading={busy} disabled={allSelected.length === 0 && selectedCnf.length === 0} variant="accent" style={{ marginBottom: 16 }} />
          <View style={styles.tileRow}>
            <View style={styles.tile}>
              <Text style={styles.tileValue}>{items.filter((i) => i.kind === 'empty').length}</Text>
              <Text style={styles.tileLabel}>{t('home.emptyTitle')}</Text>
            </View>
            <View style={styles.tile}>
              <Text style={styles.tileValue}>{items.filter((i) => i.kind === 'dust').length}</Text>
              <Text style={styles.tileLabel}>{t('home.dustTitle')}</Text>
            </View>
            <View style={styles.tile}>
              <Text style={[styles.tileValue, { color: colors.accent }]}>{fmtSol(recoveredLamports)}</Text>
              <Text style={styles.tileLabel}>SOL</Text>
            </View>
          </View>

          <View style={styles.segRow}>
            <Pressable style={[styles.seg, activeTab === 'tokens' && styles.segOn]} onPress={() => setActiveTab('tokens')}>
              <Text style={[styles.segText, activeTab === 'tokens' && styles.segTextOn]}>
                {t('home.tabTokens')} ({items.length})
              </Text>
            </Pressable>
            <Pressable style={[styles.seg, activeTab === 'cnf' && styles.segOn]} onPress={() => setActiveTab('cnf')}>
              <Text style={[styles.segText, activeTab === 'cnf' && styles.segTextOn]}>
                {t('home.tabCnf')} ({cnfAssets.length})
              </Text>
            </Pressable>
          </View>

          {activeTab === 'tokens' ? (
            <View>
              <View style={styles.listHeader}>
                <Text style={styles.sectionTitle}>{t('home.leftTitle')}</Text>
                <Pressable onPress={toggleAllLeft}>
                  <Text style={styles.selectAll}>
                    {(items.length > 0 && items.every((i) => selected.has(i.pubkey)))
                      ? t('home.clearAll') : t('home.selectAll')}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.columnDesc}>{t('home.leftDesc')}</Text>

              {hiddenTotal > 0 ? (
                <View style={styles.hiddenNote}>
                  <Text style={styles.hiddenNoteText}>
                    {t('home.hiddenNote', { count: unpriced.length })}
                    {blockedInScan > 0 ? ' · ' + t('home.blockedNote', { count: blockedInScan }) : ''}
                  </Text>
                </View>
              ) : null}

              {items.length === 0 ? (
                <Text style={styles.columnDesc}>{t('home.noEmpty')}</Text>
              ) : (
                items.map((item) => {
                  const isSelected = selected.has(item.pubkey);
                  const isDust = item.kind === 'dust';
                  const isAllowlisted = item.kind === 'unknown';
                  const m = meta[item.mint] || null;
                  const symbol = m && m.symbol ? m.symbol : null;
                  const lu = fmtLastUsed(lastUsed[item.pubkey]);
                  return (
                    <Pressable key={item.pubkey} style={[styles.columnItem, isSelected && styles.itemSelected]} onPress={() => toggle(item.pubkey)}>
                      <View style={[styles.checkSm, isSelected && styles.checkOn]}>{isSelected ? <Text style={styles.checkMark}>✓</Text> : null}</View>
                      <TokenIcon mint={item.mint} meta={m} size={30} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.columnItemTitle} numberOfLines={1}>{symbol || t('home.unknownToken')}</Text>
                        <Text style={styles.columnItemSub} numberOfLines={1}>
                          {isAllowlisted ? t('home.allowlisted') : (isDust ? t('home.dustTitle') : t('home.emptyTitle'))} · +{fmtSol(item.lamports)} SOL · {lu ? t('home.lastUsed', { date: lu }) : t('home.neverUsed')}
                        </Text>
                      </View>
                      <Pressable style={styles.hideBtn} onPress={() => blockMint(item.mint)}>
                        <Text style={styles.hideBtnText}>{t('home.block')}</Text>
                      </Pressable>
                    </Pressable>
                  );
                })
              )}
            </View>
          ) : (
            <View>
              <View style={styles.listHeader}>
                <Text style={styles.sectionTitle}>{t('home.cnfTitle')}</Text>
                <Pressable onPress={toggleAllCnf}>
                  <Text style={styles.selectAll}>
                    {cnfAssets.filter((a) => cnfVersions[a.id] !== 'v2').length > 0 && cnfAssets.filter((a) => cnfVersions[a.id] !== 'v2').every((a) => cnfSelected.has(a.id)) ? t('home.clearAll') : t('home.selectAll')}
                  </Text>
                </Pressable>
              </View>
              <Text style={styles.columnDesc}>{t('home.cnfDesc', { fee: fmtSol(CNF_BURN_FEE_LAMPORTS, 6), points: CNF_BURN_POINTS })}</Text>
              {cnfAssets.length > 0 ? (
                cnfAssets.map((asset) => {
                  const isSel = cnfSelected.has(asset.id);
                  const unsupported = cnfVersions[asset.id] === 'v2';
                  const name = (asset.content && asset.content.metadata && asset.content.metadata.name) || shortWallet(asset.id);
                  const img = (asset.content && asset.content.links && asset.content.links.image) || null;
                  return (
                    <Pressable key={asset.id} style={[styles.columnItem, isSel && styles.itemSelected, unsupported && styles.itemUnsupported]} onPress={() => toggleCnf(asset.id)}>
                      <View style={[styles.checkSm, isSel && styles.checkOn, unsupported && styles.checkDisabled]}>{isSel ? <Text style={styles.checkMark}>✓</Text> : null}</View>
                      <CnfIcon uri={img} size={30} />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.columnItemTitle} numberOfLines={1}>{name}</Text>
                        <Text style={styles.columnItemSub} numberOfLines={1}>
                          {t('home.cnfBurnTag')} · {shortWallet(asset.id)}{unsupported ? ' · ' + t('home.cnfUnsupported') : ''}
                        </Text>
                      </View>
                    </Pressable>
                  );
                })
              ) : cnfLoading ? (
                <Text style={styles.columnDesc}>{t('common.loading')}</Text>
              ) : (
                <Text style={styles.columnDesc}>{t('home.noCnf')}</Text>
              )}
            </View>
          )}

          <Card style={styles.summaryCard}>
            <Stat label={t('home.recovered')} value={`${fmtSol(recoveredLamports)} SOL` + (solUsd ? ` ≈ ${fmtUsd((recoveredLamports / 1e9) * solUsd)}` : '')} />
            <Stat label={t('home.serviceFee')} value={`${fmtSol(feeLamports)} SOL`} />
            {selectedCnf.length > 0 ? (
              <Stat label={t('home.cnfFee')} value={`${fmtSol(cnfFeeLamports, 6)} SOL`} hint={t('home.cnfFeeHint', { fee: fmtSol(CNF_BURN_FEE_LAMPORTS, 6), points: CNF_BURN_POINTS })} />
            ) : null}
            <Stat label={t('home.youGet')} value={`${fmtSol(netLamports)} SOL`} valueColor={colors.accent} />
            <Stat label={t('home.estPoints')} value={`+${fmtPoints(estPoints)}`} valueColor={colors.gold} />
            <View style={styles.feeToBlock}>
              <Text style={styles.feeToLabel}>{t('home.confirmFeeTo')}</Text>
              <Text style={styles.feeToAddress} selectable>{fmtAddress(TREASURY)}</Text>
            </View>
          </Card>

          {result ? (
            <Card style={{ marginTop: 16, borderColor: 'rgba(95,216,200,0.45)' }}>
              <Text style={styles.resultTitle}>{t('home.success')}</Text>
              <Text style={styles.resultDesc}>{result.cnfOnly ? t('home.cnfDone') : t('home.successDesc')}</Text>
              {result.totalPoints > 0 ? <Text style={styles.resultPoints}>+{fmtPoints(result.totalPoints)} {t('common.points')}</Text> : null}
            </Card>
          ) : null}
        </View>
      )}

      <Modal visible={confirmOpen} transparent animationType="fade" onRequestClose={() => setConfirmOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('home.confirmTitle')}</Text>
            <ScrollView style={{ maxHeight: 430 }} showsVerticalScrollIndicator={false}>
              <Text style={styles.modalDesc}>
                {t('home.confirmCloseCount', { count: allSelected.length })}
                {burnCount > 0 ? ' · ' + t('home.confirmDesc', { count: allSelected.length, burn: burnCount }) : ''}
              </Text>

              {summary.length > 0 ? (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('home.confirmBurnTitle')}</Text>
                  {summary.map((g, i) => (
                    <View key={i} style={styles.modalRow}>
                      <Text style={styles.modalAsset}>{g.symbol || t('home.unknownToken')} ×{g.count}{g.hasUnknown ? ' · ' + t('home.burnUnknownTag') : ''}</Text>
                      <Text style={styles.modalAssetAmount}>{fmtAmount(g.totalUi)}</Text>
                    </View>
                  ))}
                </View>
              ) : null}

              {selectedCnf.length > 0 ? (
                <View style={styles.modalSection}>
                  <Text style={styles.modalSectionTitle}>{t('home.cnfBurnTitle')} ({selectedCnf.length})</Text>
                  {selectedCnf.map((a) => (
                    <View key={a.id} style={styles.modalRow}>
                      <Text style={styles.modalAsset} numberOfLines={1}>{(a.content && a.content.metadata && a.content.metadata.name) || shortWallet(a.id)}</Text>
                      <Text style={styles.modalAssetAmount}>{t('home.cnfBurnTag')}</Text>
                    </View>
                  ))}
                  <Text style={styles.modalHint}>{t('home.cnfFeeHint', { fee: fmtSol(CNF_BURN_FEE_LAMPORTS, 6), points: CNF_BURN_POINTS })}</Text>
                </View>
              ) : null}

              <View style={styles.modalDivider} />

              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>{t('home.recovered')}</Text>
                <Text style={styles.modalValue}>{fmtSol(recoveredLamports)} SOL</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>{t('home.serviceFee')}</Text>
                <Text style={styles.modalValue}>{fmtSol(feeLamports)} SOL</Text>
              </View>
              {selectedCnf.length > 0 ? (
                <View style={styles.modalRow}>
                  <Text style={styles.modalLabel}>{t('home.cnfFee')}</Text>
                  <Text style={styles.modalValue}>{fmtSol(cnfFeeLamports, 6)} SOL</Text>
                </View>
              ) : null}
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>{t('home.youGet')}</Text>
                <Text style={[styles.modalValue, { color: colors.accent }]}>{fmtSol(netLamports)} SOL</Text>
              </View>
              <View style={styles.modalRow}>
                <Text style={styles.modalLabel}>{t('home.estPoints')}</Text>
                <Text style={[styles.modalValue, { color: colors.gold }]}>+{fmtPoints(estPoints)}</Text>
              </View>

              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>{t('home.confirmFeeTo')}</Text>
                <Text style={styles.modalAddress} selectable>{fmtAddress(TREASURY)}</Text>
              </View>
            </ScrollView>

            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, styles.modalBtnCancel]} onPress={() => setConfirmOpen(false)}>
                <Text style={styles.modalBtnCancelText}>{t('common.cancel')}</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.modalBtnGo]} onPress={runCleanup} disabled={busy}>
                <Text style={styles.modalBtnGoText}>{busy ? t('home.executing') : t('home.confirmSign')}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
  segRow: { flexDirection: 'row', backgroundColor: 'rgba(234,249,246,0.05)', borderWidth: 1, borderColor: 'rgba(234,249,246,0.10)', borderRadius: radius, padding: 4, marginTop: 18 },
  seg: { flex: 1, borderRadius: radius - 4, paddingVertical: 10, alignItems: 'center' },
  segOn: { backgroundColor: 'rgba(95,216,200,0.16)', borderWidth: 1, borderColor: 'rgba(95,216,200,0.45)' },
  segText: { color: colors.textDim, fontSize: 14, fontWeight: '700' },
  segTextOn: { color: colors.accent },
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
  checkSm: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.textFaint,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0
  },
  itemTitle: { color: colors.text, fontSize: 14, fontWeight: '700' },
  itemSub: { color: colors.textFaint, fontSize: 11, marginTop: 2 },
  itemValue: { color: colors.accent, fontSize: 14, fontWeight: '700' },
  itemDust: { color: colors.warn, fontSize: 11, marginTop: 2, maxWidth: 200 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 18 },
  column: {
    flex: 1,
    backgroundColor: 'rgba(234,249,246,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(234,249,246,0.08)',
    borderRadius: radius,
    padding: 12,
    minWidth: 0
  },
  columnDesc: { color: colors.textFaint, fontSize: 11, lineHeight: 16, marginBottom: 8 },
  columnSub: { marginTop: 14 },
  subTitle: { color: colors.warn, fontSize: 12, fontWeight: '700' },
  columnItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(234,249,246,0.05)',
    borderWidth: 1,
    borderColor: 'rgba(234,249,246,0.10)',
    borderRadius: radius,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 8,
    gap: 8
  },
  columnItemTitle: { color: colors.text, fontSize: 13, fontWeight: '700' },
  columnItemSub: { color: colors.textFaint, fontSize: 10, marginTop: 2 },
  itemUnsupported: { opacity: 0.45 },
  checkDisabled: { borderColor: 'rgba(234,249,246,0.15)' },
  hiddenNote: {
    backgroundColor: 'rgba(255,201,77,0.07)',
    borderWidth: 1,
    borderColor: 'rgba(255,201,77,0.25)',
    borderRadius: radius,
    padding: 10,
    marginBottom: 10
  },
  hiddenNoteText: { color: colors.warn, fontSize: 12, lineHeight: 17 },
  hideBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(234,249,246,0.16)',
    marginLeft: 8
  },
  hideBtnText: { color: colors.textFaint, fontSize: 11 },
  skippedSection: { marginTop: 14 },
  skippedCount: { color: colors.warn, fontSize: 13, fontWeight: '700' },
  skippedDesc: { color: colors.textFaint, fontSize: 12, lineHeight: 18, marginBottom: 8 },
  itemSkipped: { opacity: 0.72, borderColor: 'rgba(234,249,246,0.06)' },
  skippedAmount: { color: colors.textDim, fontSize: 13, fontWeight: '700' },
  cnfFallback: { backgroundColor: 'rgba(95,216,200,0.10)', borderWidth: 1, borderColor: 'rgba(95,216,200,0.4)', alignItems: 'center', justifyContent: 'center' },
  summaryCard: {
    marginTop: 12,
    backgroundColor: 'rgba(95,216,200,0.05)',
    borderColor: 'rgba(95,216,200,0.28)'
  },
  feeToBlock: { marginTop: 6, borderTopWidth: 1, borderTopColor: 'rgba(234,249,246,0.08)', paddingTop: 10 },
  feeToLabel: { color: colors.textDim, fontSize: 14 },
  feeToAddress: { color: colors.textFaint, fontSize: 12, lineHeight: 18, marginTop: 4, letterSpacing: 0.5 },
  resultTitle: { color: colors.accent, fontSize: 16, fontWeight: '800' },
  resultDesc: { color: colors.textDim, fontSize: 13, marginTop: 4 },
  resultPoints: { color: colors.gold, fontSize: 20, fontWeight: '800', marginTop: 8 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(5,9,11,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24
  },
  modalCard: {
    width: '100%',
    maxWidth: 480,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: 'rgba(95,216,200,0.35)',
    borderRadius: radius + 4,
    padding: 20
  },
  modalTitle: { color: colors.text, fontSize: 18, fontWeight: '800', marginBottom: 10 },
  modalDesc: { color: colors.textDim, fontSize: 13, lineHeight: 19 },
  modalSection: { marginTop: 14 },
  modalSectionTitle: { color: colors.textFaint, fontSize: 12, fontWeight: '700', marginBottom: 6 },
  modalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 5 },
  modalLabel: { color: colors.textDim, fontSize: 14 },
  modalValue: { color: colors.text, fontSize: 14, fontWeight: '700' },
  modalAsset: { color: colors.text, fontSize: 14, fontWeight: '700' },
  modalAssetAmount: { color: colors.warn, fontSize: 13 },
  modalDivider: { height: 1, backgroundColor: 'rgba(234,249,246,0.10)', marginVertical: 10 },
  modalAddress: { color: colors.textFaint, fontSize: 12, marginTop: 4, lineHeight: 17 },
  modalHint: { color: colors.textFaint, fontSize: 12, marginTop: 6, lineHeight: 17 },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 18 },
  modalBtn: { flex: 1, height: 48, borderRadius: radius, alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  modalBtnCancel: { backgroundColor: 'rgba(234,249,246,0.06)', borderColor: 'rgba(234,249,246,0.14)' },
  modalBtnCancelText: { color: colors.textDim, fontWeight: '700' },
  modalBtnGo: { backgroundColor: colors.accent, borderColor: colors.accent },
  modalBtnGoText: { color: '#06281C', fontWeight: '800' }
});
