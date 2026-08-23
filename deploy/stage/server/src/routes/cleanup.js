import { Router } from 'express';
import { requireAuth, handle } from '../middleware.js';
import { reportCleanup } from '../services/cleanup.service.js';

const router = Router();

router.post('/cleanup/report', requireAuth, handle(async (req, res) => {
  const result = await reportCleanup(req.user, req.body.signatures);
  res.json(result);
}));

export default router;