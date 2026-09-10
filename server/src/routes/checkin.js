import { Router } from 'express';
import { requireAuth, handle } from '../middleware.js';
import { checkinStatus, awardCheckin, verifyCheckinTx, recoverCheckinFromChain } from '../services/checkin.service.js';
import { db } from '../db.js';
import { utcDateString } from '../services/points.js';

const router = Router();

router.get('/checkin/status', requireAuth, handle(async (req, res) => {
  const status = checkinStatus(req.user);
  if (!status.alreadyDone) {
    const recovered = await recoverCheckinFromChain(req.user, status.date);
    if (recovered && recovered.recovered) {
      const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
      const fresh = checkinStatus(freshUser);
      return res.json({ ...fresh, recovered: true, awarded: recovered.awarded });
    }
  }
  res.json(status);
}));

router.post('/checkin/report', requireAuth, handle(async (req, res) => {
  const signature = String(req.body.signature || '').trim();
  if (!signature) return res.status(400).json({ error: 'missing signature' });
  const today = utcDateString();
  await verifyCheckinTx(signature, req.user.wallet, today);
  const result = awardCheckin(req.user, signature, today);
  res.json({ ...result, date: today });
}));

export default router;
