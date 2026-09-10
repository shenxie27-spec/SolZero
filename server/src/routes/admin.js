import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import { db } from '../db.js';
import { config } from '../config.js';
import { getConnection, LAMPORTS_PER_SOL, TREASURY } from 'solzero-core';

const router = Router();

function tokenMatches(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string' || candidate.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

function requireAdmin(req, res, next) {
  const expected = process.env.SOLZERO_ADMIN_TOKEN;
  if (!expected) return res.status(503).json({ error: 'admin token not configured' });
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!tokenMatches(token, expected)) return res.status(401).json({ error: 'unauthorized' });
  next();
}

function sol(lamports) {
  return Math.round((Number(lamports || 0) / LAMPORTS_PER_SOL) * 100000) / 100000;
}

router.get('/admin/summary', requireAdmin, async (req, res) => {
  const today = new Date().toISOString().slice(0, 10);

  const usersTotal = db.prepare('SELECT COUNT(*) c FROM users').get().c;
  const usersToday = db.prepare("SELECT COUNT(*) c FROM users WHERE date(created_at) = ?").get(today).c;
  const activeToday = db.prepare("SELECT COUNT(DISTINCT user_id) c FROM points_ledger WHERE date(created_at) = ?").get(today).c;

  const pointsTotal = Math.round(Number(db.prepare('SELECT COALESCE(SUM(amount),0) s FROM points_ledger').get().s) * 10) / 10;
  const pointsToday = Math.round(Number(db.prepare("SELECT COALESCE(SUM(amount),0) s FROM points_ledger WHERE date(created_at) = ?").get(today).s) * 10) / 10;

  const kinds = db.prepare('SELECT kind, COALESCE(SUM(amount),0) s FROM points_ledger GROUP BY kind').all();
  const kindsToday = db.prepare("SELECT kind, COALESCE(SUM(amount),0) s FROM points_ledger WHERE date(created_at) = ? GROUP BY kind").all(today);
  const pointsByKind = { total: {}, today: {} };
  for (const k of kinds) pointsByKind.total[k.kind] = Math.round(Number(k.s) * 10) / 10;
  for (const k of kindsToday) pointsByKind.today[k.kind] = Math.round(Number(k.s) * 10) / 10;

  const streaks = db.prepare('SELECT streak, COUNT(*) c FROM users WHERE streak > 0 GROUP BY streak ORDER BY streak').all();
  const streakDist = {};
  for (const s of streaks) streakDist[String(Math.min(s.streak, 7))] = (streakDist[String(Math.min(s.streak, 7))] || 0) + s.c;

  const leaderboard = db.prepare('SELECT wallet, points, streak, created_at AS createdAt FROM users ORDER BY points DESC LIMIT 10').all()
    .map((r) => ({ ...r, points: Math.round(Number(r.points) * 10) / 10 }));

  const l1Count = db.prepare("SELECT COUNT(*) c FROM referrals WHERE level = 1").get().c;
  const l2Count = db.prepare("SELECT COUNT(*) c FROM referrals WHERE level = 2").get().c;
  const bonusTotal = Math.round(Number(db.prepare("SELECT COALESCE(SUM(amount),0) s FROM points_ledger WHERE kind IN ('referral_l1','referral_l2')").get().s) * 10) / 10;
  const topReferrers = db.prepare(`
    SELECT u.wallet, COUNT(*) c
    FROM referrals r JOIN users u ON u.id = r.referrer_id
    GROUP BY r.referrer_id ORDER BY c DESC LIMIT 10
  `).all();

  const cleanupRows = db.prepare("SELECT COUNT(*) c FROM points_ledger WHERE kind = 'cleanup'").get().c;
  const cnfRows = db.prepare("SELECT note FROM points_ledger WHERE kind = 'cnf_burn'").all();
  let cnfBurns = 0;
  for (const r of cnfRows) {
    const m = /burned (\d+)/.exec(r.note || '');
    if (m) cnfBurns += Number(m[1]);
  }
  let recoveredLamports = 0;
  for (const r of db.prepare("SELECT note FROM points_ledger WHERE kind = 'cleanup'").all()) {
    const m = /recovered (\d+) lamports/.exec(r.note || '');
    if (m) recoveredLamports += Number(m[1]);
  }
  const feeSolTotal = sol(recoveredLamports * config.feeRate);
  const cnfFeeSolTotal = sol(cnfBurns * 5000);

  let treasuryBalanceSol = null;
  try {
    const connection = getConnection(config.cluster);
    const bal = await connection.getBalance(TREASURY);
    treasuryBalanceSol = sol(bal);
  } catch (err) {
    treasuryBalanceSol = null;
  }

  const activity = db.prepare(`
    SELECT l.kind, l.amount, l.note, l.created_at AS createdAt, u.wallet
    FROM points_ledger l JOIN users u ON u.id = l.user_id
    ORDER BY l.id DESC LIMIT 20
  `).all().map((r) => ({ ...r, amount: Math.round(Number(r.amount) * 10) / 10 }));

  const errorsToday = db.prepare("SELECT COUNT(*) c FROM error_reports WHERE date(created_at) = ?").get(today).c;
  const errorsTotal = db.prepare('SELECT COUNT(*) c FROM error_reports').get().c;
  const errorContexts = db.prepare('SELECT context, COUNT(*) c FROM error_reports GROUP BY context ORDER BY c DESC LIMIT 12').all();
  const recentErrors = db.prepare(`
    SELECT context, message, wallet, app_version AS appVersion, created_at AS createdAt
    FROM error_reports ORDER BY id DESC LIMIT 20
  `).all();

  let disk = null;
  try {
    const out = execFileSync('df', ['-k', '/']).toString().split('\n')[1].trim().split(/\s+/);
    disk = { totalKb: Number(out[1]), usedKb: Number(out[2]), availKb: Number(out[3]) };
  } catch (err) {
    disk = null;
  }

  let rpcLatencyMs = null;
  try {
    const t0 = Date.now();
    await fetch('https://api.mainnet-beta.solana.com', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getHealth' }),
      signal: AbortSignal.timeout(5000)
    });
    rpcLatencyMs = Date.now() - t0;
  } catch (err) {
    rpcLatencyMs = null;
  }

  const mem = process.memoryUsage();
  res.json({
    at: new Date().toISOString(),
    users: { total: usersTotal, today: usersToday, activeToday },
    points: { total: pointsTotal, today: pointsToday, byKind: pointsByKind, streakDist },
    leaderboard,
    invite: { l1Count, l2Count, bonusTotal, topReferrers },
    treasury: {
      address: TREASURY.toBase58 ? TREASURY.toBase58() : String(TREASURY),
      balanceSol: treasuryBalanceSol,
      feeSolTotal,
      cnfFeeSolTotal,
      recoveredSolTotal: sol(recoveredLamports),
      cleanupTxCount: cleanupRows,
      cnfBurns
    },
    activity,
    errors: { today: errorsToday, total: errorsTotal, contexts: errorContexts, recent: recentErrors },
    system: {
      uptimeSec: Math.floor(os.uptime()),
      node: process.version,
      memRssMb: Math.round(mem.rss / 1048576),
      memTotalMb: Math.round(os.totalmem() / 1048576),
      memFreeMb: Math.round(os.freemem() / 1048576),
      disk,
      rpcLatencyMs
    }
  });
});

export default router;
