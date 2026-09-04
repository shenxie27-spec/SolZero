import { Router } from 'express';
import { requireAuth, handle } from '../middleware.js';
import { taskStatus, claimTask, verifyTaskTx } from '../services/task.service.js';
import { utcDateString } from '../services/points.js';

const router = Router();

router.get('/task/status', requireAuth, handle((req, res) => {
  res.json(taskStatus(req.user));
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
