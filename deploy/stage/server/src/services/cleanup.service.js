import { getConnection, verifyCleanupSignatures, getSolUsdPrice } from 'solzero-core';
import { db } from '../db.js';
import { config } from '../config.js';
import { cleanupPointsForUsd, referralPoints } from './points.js';

export async function reportCleanup(user, signatures) {
  if (!Array.isArray(signatures) || signatures.length === 0 || signatures.length > 50) {
    throw Object.assign(new Error('请提供 1-50 笔交易签名'), { status: 400 });
  }

  const connection = getConnection(config.cluster);
  const results = await verifyCleanupSignatures(connection, signatures, {
    feeWallet: config.treasury,
    feeRate: config.feeRate
  });

  let solPrice = 0;
  try {
    solPrice = await getSolUsdPrice();
  } catch (err) {
    solPrice = 0;
  }

  const verified = [];
  const failed = [];
  let totalPoints = 0;

  for (const r of results) {
    if (!r.ok) {
      failed.push({ sig: r.sig, error: r.error });
      continue;
    }

    db.exec('BEGIN IMMEDIATE');
    try {
      const claimed = db.prepare('SELECT 1 FROM claimed_sigs WHERE sig = ?').get(r.sig);
      if (claimed) {
        db.exec('COMMIT');
        verified.push({ sig: r.sig, claimed: true, points: 0, recoveredLamports: r.recoveredLamports, feeLamports: r.feeLamports });
        continue;
      }

      const grossUsd = solPrice > 0 ? (r.recoveredLamports / 1e9) * solPrice : 0;
      const awarded = cleanupPointsForUsd(grossUsd);

      db.prepare('INSERT INTO claimed_sigs (sig, user_id, kind) VALUES (?, ?, ?)').run(r.sig, user.id, 'cleanup');
      db.prepare("INSERT INTO points_ledger (user_id, kind, amount, ref_sig, note) VALUES (?, 'cleanup', ?, ?, ?)")
        .run(user.id, awarded, r.sig, `recovered ${r.recoveredLamports} lamports`);
      db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(awarded, user.id);

      const l1 = db.prepare('SELECT referrer_id FROM referrals WHERE downline_id = ? AND level = 1').get(user.id);
      const l2 = db.prepare('SELECT referrer_id FROM referrals WHERE downline_id = ? AND level = 2').get(user.id);
      const bonus1 = l1 ? referralPoints(awarded, config.inviteL1) : 0;
      const bonus2 = l2 ? referralPoints(awarded, config.inviteL2) : 0;

      if (bonus1 > 0) {
        db.prepare("INSERT INTO points_ledger (user_id, kind, amount, ref_sig, note) VALUES (?, 'referral_l1', ?, ?, ?)")
          .run(l1.referrer_id, bonus1, `${r.sig}:l1:${user.id}`, `L1 ${user.wallet}`);
        db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(bonus1, l1.referrer_id);
      }
      if (bonus2 > 0) {
        db.prepare("INSERT INTO points_ledger (user_id, kind, amount, ref_sig, note) VALUES (?, 'referral_l2', ?, ?, ?)")
          .run(l2.referrer_id, bonus2, `${r.sig}:l2:${user.id}`, `L2 ${user.wallet}`);
        db.prepare('UPDATE users SET points = points + ? WHERE id = ?').run(bonus2, l2.referrer_id);
      }

      db.exec('COMMIT');
      totalPoints += awarded;
      verified.push({
        sig: r.sig,
        recoveredLamports: r.recoveredLamports,
        feeLamports: r.feeLamports,
        closedCount: r.closedCount,
        burnedCount: r.burnedCount,
        grossUsd: Math.round(grossUsd * 10000) / 10000,
        points: awarded
      });
    } catch (err) {
      db.exec('ROLLBACK');
      failed.push({ sig: r.sig, error: err.message });
    }
  }

  const fresh = db.prepare('SELECT points FROM users WHERE id = ?').get(user.id);
  return { verified, failed, totalPoints, balance: fresh.points, solPrice };
}