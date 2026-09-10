import { getConnection, parseCheckinMemo, CHECKIN_PREFIX, fetchConfirmedTx } from 'solzero-core';
import { db } from '../db.js';
import { config } from '../config.js';
import { computeStreak, ladderPoints, utcDateString } from './points.js';

const lastSweepByUser = new Map();
const SWEEP_INTERVAL_MS = 60 * 1000;

export async function verifyCheckinTx(signature, wallet, today) {
  const connection = getConnection(config.cluster);
  let tx;
  try {
    tx = await fetchConfirmedTx(connection, signature);
  } catch (err) {
    throw Object.assign(new Error('无法读取链上交易，请稍后重试'), { status: 502 });
  }
  if (!tx) throw Object.assign(new Error('交易未确认，请稍后重试'), { status: 404 });
  if (tx.meta && tx.meta.err) throw Object.assign(new Error('该交易在链上执行失败'), { status: 422 });

  const memos = parseCheckinMemo(tx);
  if (!memos.includes(`${CHECKIN_PREFIX}${today}`)) {
    throw Object.assign(new Error('签到内容与日期不匹配'), { status: 422 });
  }

  const message = tx.transaction.message;
  const keys = message.getAccountKeys ? message.getAccountKeys() : message.accountKeys;
  const numRequired = message.header ? message.header.numRequiredSignatures : 1;
  let signedByWallet = false;
  for (let i = 0; i < numRequired; i++) {
    const key = keys.get ? keys.get(i) : keys[i];
    if (key.toBase58() === wallet) {
      signedByWallet = true;
      break;
    }
  }
  if (!signedByWallet) throw Object.assign(new Error('该交易不是由当前钱包签名的'), { status: 422 });
  return true;
}

export function awardCheckin(user, signature, today) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const fresh = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    if (fresh.last_checkin_date === today) {
      throw Object.assign(new Error('今天已经签到过了'), { status: 409 });
    }
    const claimed = db.prepare("SELECT id FROM points_ledger WHERE kind = 'checkin' AND ref_sig = ?").get(signature);
    if (claimed) {
      throw Object.assign(new Error('该签到交易已使用过'), { status: 409 });
    }

    const { streak } = computeStreak(fresh.last_checkin_date, today, fresh.streak);
    const awarded = ladderPoints(streak);
    db.prepare('UPDATE users SET streak = ?, last_checkin_date = ?, points = ROUND(points + ?, 1) WHERE id = ?')
      .run(streak, today, awarded, user.id);
    db.prepare("INSERT INTO points_ledger (user_id, kind, amount, ref_sig, note) VALUES (?, 'checkin', ?, ?, ?)")
      .run(user.id, awarded, signature, `streak ${streak}`);
    db.exec('COMMIT');
    return { alreadyDone: false, awarded, streak, points: fresh.points + awarded };
  } catch (err) {
    try { db.exec('ROLLBACK'); } catch (ignored) { /* already rolled back */ }
    throw err;
  }
}

export function checkinStatus(user) {
  const today = utcDateString();
  return {
    date: today,
    alreadyDone: user.last_checkin_date === today,
    streak: user.streak,
    ladder: [1, 2, 3, 4, 5, 6, 7]
  };
}

export async function recoverCheckinFromChain(user, today = utcDateString()) {
  const now = Date.now();
  const last = lastSweepByUser.get(user.id) || 0;
  if (now - last < SWEEP_INTERVAL_MS) return null;
  lastSweepByUser.set(user.id, now);

  try {
    const connection = getConnection(config.cluster);
    const sigs = await connection.getSignaturesForAddress(user.wallet, { limit: 10 });
    const cutoff = Math.floor(now / 1000) - 600;
    for (const s of sigs.slice(0, 5)) {
      if (!s.blockTime || s.blockTime < cutoff || s.err) continue;
      const tx = await fetchConfirmedTx(connection, s.signature, { retries: 1, intervalMs: 500 });
      if (!tx || (tx.meta && tx.meta.err)) continue;
      const memos = parseCheckinMemo(tx);
      if (!memos.includes(`${CHECKIN_PREFIX}${today}`)) continue;
      const message = tx.transaction.message;
      const keys = message.getAccountKeys ? message.getAccountKeys() : message.accountKeys;
      const numRequired = message.header ? message.header.numRequiredSignatures : 1;
      let signedByWallet = false;
      for (let i = 0; i < numRequired; i++) {
        const key = keys.get ? keys.get(i) : keys[i];
        if (key.toBase58() === user.wallet) {
          signedByWallet = true;
          break;
        }
      }
      if (!signedByWallet) continue;
      try {
        const result = awardCheckin(user, s.signature, today);
        return { ...result, recovered: true };
      } catch (err) {
        if (err.status === 409) return { alreadyDone: true, recovered: false };
        return null;
      }
    }
  } catch (err) {
    /* sweep failure is non-fatal */
  }
  return null;
}
