import { Router } from 'express';
import { requireAuth, handle } from '../middleware.js';
import { taskStatus, claimTask, verifyTaskTx, recoverTaskFromChain } from '../services/task.service.js';
import { db } from '../db.js';
import { utcDateString } from '../services/points.js';

const router = Router();

router.get('/task/status', requireAuth, handle(async (req, res) => {
  const status = taskStatus(req.user);
  if (status.cleanupDone && !status.claimed) {
    const recovered = await recoverTaskFromChain(req.user, status.date);
    if (recovered && recovered.recovered) {
      const freshUser = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
      const fresh = taskStatus(freshUser);
      return res.json({ ...fresh, recovered: true, awarded: recovered.awarded });
    }
  }
  res.json(status);
}));

router.post('/task/claim', requireAuth, handle(async (req, res) => {
  const signature = String(req.body.signature || '').trim();
  if (!signature) return res.status(400).json({ error: 'missing signature' });
  const today = utcDateString();
  await verifyTaskTx(signature, req.user.wallet, today);
  const result = claimTask(req.user, signature, today);
  res.json(result);
}));

export default router;
