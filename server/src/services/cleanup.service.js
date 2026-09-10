import { getConnection, verifyCleanupSignatures, verifyCnfBurnSignatures, getSolUsdPrice, CNF_BURN_POINTS } from 'solzero-core';
import { db } from '../db.js';
import { config } from '../config.js';
import { cleanupPointsForUsd, referralPoints, utcDateString } from './points.js';

export async function reportCleanup(user, body = {}) {
  const signatures = Array.isArray(body.signatures) ? body.signatures : [];
  const cnfSignatures = Array.isArray(body.cnfSignatures) ? body.cnfSignatures : [];
  if (signatures.length + cnfSignatures.length === 0 || signatures.length + cnfSignatures.length > 50) {
    throw Object.assign(new Error('请提供 1-50 笔交易签名'), { status: 400 });
  }

  const connection = getConnection(config.cluster);
  const results = signatures.length > 0
    ? await verifyCleanupSignatures(connection, signatures, {
        feeWallet: config.treasury,
        feeRate: config.feeRate,
        expectPayer: user.wallet
      })
    : [];
  const cnfResults = cnfSignatures.length > 0
    ? await verifyCnfBurnSignatures(connection, cnfSignatures.map((c) => c.sig), {
        feeWallet: config.treasury,
        expectPayer: user.wallet
      })
    : [];

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
      const today = utcDateString();

      db.prepare('INSERT INTO claimed_sigs (sig, user_id, kind) VALUES (?, ?, ?)').run(r.sig, user.id, 'cleanup');
      db.prepare("INSERT INTO points_ledger (user_id, kind, amount, ref_sig, note) VALUES (?, 'cleanup', ?, ?, ?)")
        .run(user.id, awarded, r.sig, `recovered ${r.recoveredLamports} lamports`);
      db.prepare('UPDATE users SET points = ROUND(points + ?, 1) WHERE id = ?').run(awarded, user.id);
      db.prepare('UPDATE users SET last_cleanup_date = ? WHERE id = ?').run(today, user.id);

      const l1 = db.prepare('SELECT referrer_id FROM referrals WHERE downline_id = ? AND level = 1').get(user.id);
      const l2 = db.prepare('SELECT referrer_id FROM referrals WHERE downline_id = ? AND level = 2').get(user.id);
      const bonus1 = l1 ? referralPoints(awarded, config.inviteL1) : 0;
      const bonus2 = l2 ? referralPoints(awarded, config.inviteL2) : 0;

      if (bonus1 > 0) {
        db.prepare("INSERT INTO points_ledger (user_id, kind, amount, ref_sig, note) VALUES (?, 'referral_l1', ?, ?, ?)")
          .run(l1.referrer_id, bonus1, `${r.sig}:l1:${user.id}`, `L1 ${user.wallet}`);
        db.prepare('UPDATE users SET points = ROUND(points + ?, 1) WHERE id = ?').run(bonus1, l1.referrer_id);
      }
      if (bonus2 > 0) {
        db.prepare("INSERT INTO points_ledger (user_id, kind, amount, ref_sig, note) VALUES (?, 'referral_l2', ?, ?, ?)")
          .run(l2.referrer_id, bonus2, `${r.sig}:l2:${user.id}`, `L2 ${user.wallet}`);
        db.prepare('UPDATE users SET points = ROUND(points + ?, 1) WHERE id = ?').run(bonus2, l2.referrer_id);
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

  for (const r of cnfResults) {
    if (!r.ok) {
      failed.push({ sig: r.sig, error: r.error, cnf: true });
      continue;
    }

    db.exec('BEGIN IMMEDIATE');
    try {
      const claimed = db.prepare('SELECT 1 FROM claimed_sigs WHERE sig = ?').get(r.sig);
      if (claimed) {
        db.exec('COMMIT');
        verified.push({ sig: r.sig, claimed: true, cnfBurns: r.burns, points: 0 });
        continue;
      }

      const awarded = Math.round(CNF_BURN_POINTS * r.burns * 10) / 10;

      db.prepare('INSERT INTO claimed_sigs (sig, user_id, kind) VALUES (?, ?, ?)').run(r.sig, user.id, 'cnf_burn');
      db.prepare("INSERT INTO points_ledger (user_id, kind, amount, ref_sig, note) VALUES (?, 'cnf_burn', ?, ?, ?)")
        .run(user.id, awarded, r.sig, `burned ${r.burns} compressed NFTs`);
      db.prepare('UPDATE users SET points = ROUND(points + ?, 1) WHERE id = ?').run(awarded, user.id);

      const l1 = db.prepare('SELECT referrer_id FROM referrals WHERE downline_id = ? AND level = 1').get(user.id);
      const l2 = db.prepare('SELECT referrer_id FROM referrals WHERE downline_id = ? AND level = 2').get(user.id);
      const bonus1 = l1 ? referralPoints(awarded, config.inviteL1) : 0;
      const bonus2 = l2 ? referralPoints(awarded, config.inviteL2) : 0;

      if (bonus1 > 0) {
        db.prepare("INSERT INTO points_ledger (user_id, kind, amount, ref_sig, note) VALUES (?, 'referral_l1', ?, ?, ?)")
          .run(l1.referrer_id, bonus1, `${r.sig}:l1:${user.id}`, `L1 ${user.wallet}`);
        db.prepare('UPDATE users SET points = ROUND(points + ?, 1) WHERE id = ?').run(bonus1, l1.referrer_id);
      }
      if (bonus2 > 0) {
        db.prepare("INSERT INTO points_ledger (user_id, kind, amount, ref_sig, note) VALUES (?, 'referral_l2', ?, ?, ?)")
          .run(l2.referrer_id, bonus2, `${r.sig}:l2:${user.id}`, `L2 ${user.wallet}`);
        db.prepare('UPDATE users SET points = ROUND(points + ?, 1) WHERE id = ?').run(bonus2, l2.referrer_id);
      }

      db.exec('COMMIT');
      totalPoints += awarded;
      verified.push({ sig: r.sig, cnfBurns: r.burns, feeLamports: r.feeLamports, points: awarded });
    } catch (err) {
      db.exec('ROLLBACK');
      failed.push({ sig: r.sig, error: err.message, cnf: true });
    }
  }

  const fresh = db.prepare('SELECT points FROM users WHERE id = ?').get(user.id);
  return { verified, failed, totalPoints, balance: fresh.points, solPrice };
}
