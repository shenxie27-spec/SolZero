import { Router } from 'express';
import { db } from '../db.js';
import { requireAuth, handle, publicUser } from '../middleware.js';

const router = Router();
const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const ALLOWLIST_LIMIT = 100;

router.get('/me', requireAuth, handle((req, res) => {
  const l1 = db.prepare(`
    SELECT u.id, u.wallet, u.points, u.created_at AS createdAt
    FROM referrals r JOIN users u ON u.id = r.downline_id
    WHERE r.referrer_id = ? AND r.level = 1 ORDER BY r.id DESC
  `).all(req.user.id);
  const l2 = db.prepare(`
    SELECT u.id, u.wallet, u.points, u.created_at AS createdAt
    FROM referrals r JOIN users u ON u.id = r.downline_id
    WHERE r.referrer_id = ? AND r.level = 2 ORDER BY r.id DESC
  `).all(req.user.id);
  const earned = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) AS total FROM points_ledger
    WHERE user_id = ? AND kind IN ('referral_l1', 'referral_l2')
  `).get(req.user.id);

  res.json({
    user: publicUser(req.user),
    invites: { l1Count: l1.length, l2Count: l2.length, earned: earned.total, l1, l2 }
  });
}));

router.get('/me/points', requireAuth, handle((req, res) => {
  const offset = Math.max(0, Number(req.query.offset || 0));
  const rows = db.prepare(`
    SELECT id, kind, amount, ref_sig AS refSig, note, created_at AS createdAt
    FROM points_ledger WHERE user_id = ? ORDER BY id DESC LIMIT 50 OFFSET ?
  `).all(req.user.id, offset);
  res.json({ rows });
}));

router.get('/me/blocked', requireAuth, handle((req, res) => {
  const rows = db.prepare('SELECT mint FROM blocked_mints WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ mints: rows.map((r) => r.mint) });
}));

router.get('/me/cleanable', requireAuth, handle((req, res) => {
  const rows = db.prepare('SELECT mint FROM cleanup_allowlist WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id);
  res.json({ mints: rows.map((r) => r.mint) });
}));

router.post('/blocked', requireAuth, handle((req, res) => {
  const mint = String(req.body.mint || '').trim();
  if (!MINT_RE.test(mint)) {
    return res.status(400).json({ error: 'bad mint' });
  }
  db.prepare('INSERT OR IGNORE INTO blocked_mints (user_id, mint) VALUES (?, ?)').run(req.user.id, mint);
  res.json({ ok: true });
}));

router.post('/cleanable', requireAuth, handle((req, res) => {
  const mint = String(req.body.mint || '').trim();
  if (!MINT_RE.test(mint)) {
    return res.status(400).json({ error: 'bad mint' });
  }
  const count = db.prepare('SELECT COUNT(*) AS n FROM cleanup_allowlist WHERE user_id = ?').get(req.user.id).n;
  if (count >= ALLOWLIST_LIMIT) {
    return res.status(409).json({ error: 'allowlist is full' });
  }
  db.prepare('INSERT OR IGNORE INTO cleanup_allowlist (user_id, mint) VALUES (?, ?)').run(req.user.id, mint);
  res.json({ ok: true });
}));

router.delete('/blocked/:mint', requireAuth, handle((req, res) => {
  const mint = String(req.params.mint || '').trim();
  db.prepare('DELETE FROM blocked_mints WHERE user_id = ? AND mint = ?').run(req.user.id, mint);
  res.json({ ok: true });
}));

router.delete('/cleanable/:mint', requireAuth, handle((req, res) => {
  const mint = String(req.params.mint || '').trim();
  db.prepare('DELETE FROM cleanup_allowlist WHERE user_id = ? AND mint = ?').run(req.user.id, mint);
  res.json({ ok: true });
}));

router.delete('/account', requireAuth, handle((req, res) => {
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('DELETE FROM referrals WHERE referrer_id = ? OR downline_id = ?').run(req.user.id, req.user.id);
    db.prepare('DELETE FROM claimed_sigs WHERE user_id = ?').run(req.user.id);
    db.prepare('DELETE FROM points_ledger WHERE user_id = ?').run(req.user.id);
    db.prepare('DELETE FROM blocked_mints WHERE user_id = ?').run(req.user.id);
    db.prepare('DELETE FROM cleanup_allowlist WHERE user_id = ?').run(req.user.id);
    db.prepare('DELETE FROM auth_nonces WHERE wallet = ?').run(req.user.wallet);
    db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
    db.exec('COMMIT');
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
  res.json({ ok: true });
}));

export default router;
