import { Router } from 'express';
import { timingSafeEqual } from 'node:crypto';
import { db } from '../db.js';

const router = Router();

// 每个 IP 每分钟最多上报 30 条，避免接口被刷。
const rateBuckets = new Map();
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 1000;

function clientIp(req) {
  const cf = req.headers['cf-connecting-ip'];
  if (typeof cf === 'string' && cf) return cf;
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff) return xff.split(',')[0].trim();
  return req.socket.remoteAddress || '';
}

function allowReport(ip) {
  const now = Date.now();
  let entries = rateBuckets.get(ip);
  if (!entries) {
    entries = [];
    rateBuckets.set(ip, entries);
  }
  while (entries.length > 0 && now - entries[0] > RATE_WINDOW_MS) entries.shift();
  if (entries.length >= RATE_LIMIT) return false;
  entries.push(now);
  if (rateBuckets.size > 5000) {
    for (const [key, list] of rateBuckets) {
      if (list.length === 0 || now - list[list.length - 1] > RATE_WINDOW_MS) rateBuckets.delete(key);
    }
  }
  return true;
}

function str(value, maxLen) {
  return typeof value === 'string' ? value.slice(0, maxLen) : null;
}

function tokenMatches(candidate, expected) {
  if (typeof candidate !== 'string' || typeof expected !== 'string' || candidate.length !== expected.length) {
    return false;
  }
  return timingSafeEqual(Buffer.from(candidate), Buffer.from(expected));
}

router.post('/errors', (req, res) => {
  const ip = clientIp(req);
  if (!allowReport(ip)) {
    return res.status(429).json({ error: 'too many reports' });
  }

  const body = req.body || {};
  const message = str(body.message, 2000);
  if (!message || !message.trim()) {
    return res.status(400).json({ error: 'missing message' });
  }

  try {
    db.prepare(`
      INSERT INTO error_reports
        (context, message, stack, wallet, ip, user_agent, app_version, platform)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      str(body.context, 64) || 'app',
      message,
      str(body.stack, 5000),
      str(body.wallet, 64),
      str(ip, 64),
      str(req.headers['user-agent'], 300),
      str(body.appVersion, 32),
      str(body.platform, 64)
    );
  } catch (err) {
    return res.status(500).json({ error: 'failed to store report' });
  }
  return res.json({ ok: true });
});

router.get('/admin/errors', (req, res) => {
  const expected = process.env.SOLZERO_ADMIN_TOKEN;
  if (!expected) {
    return res.status(503).json({ error: 'admin token not configured' });
  }
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!tokenMatches(token, expected)) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const limit = Math.min(500, Math.max(1, Number(req.query.limit || 100) || 100));
  const rows = db.prepare(`
    SELECT id, context, message, stack, wallet, ip, user_agent AS userAgent,
           app_version AS appVersion, platform, created_at AS createdAt
    FROM error_reports
    ORDER BY id DESC
    LIMIT ?
  `).all(limit);
  res.json({ rows });
});

export default router;
