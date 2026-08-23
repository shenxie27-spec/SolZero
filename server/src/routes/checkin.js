import { Router } from 'express';
import { requireAuth, handle } from '../middleware.js';
import { checkinStatus, awardCheckin, verifyCheckinTx } from '../services/checkin.service.js';
import { utcDateString } from '../services/points.js';

const router = Router();

router.get('/checkin/status', requireAuth, handle((req, res) => {
  res.json(checkinStatus(req.user));
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