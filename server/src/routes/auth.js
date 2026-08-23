import { Router } from 'express';
import { createChallenge, verifyChallenge, signToken, generateInviteCode, bindInvite } from '../auth.js';
import { db } from '../db.js';
import { handle, publicUser } from '../middleware.js';

const router = Router();

router.post('/challenge', handle((req, res) => {
  const wallet = String(req.body.wallet || '').trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet)) {
    return res.status(400).json({ error: 'invalid wallet address' });
  }
  const { nonce, message } = createChallenge(wallet);
  res.json({ message, nonce });
}));

router.post('/verify', handle((req, res) => {
  const { wallet, nonce, signature, inviteCode } = req.body;
  if (!wallet || !nonce || !signature) return res.status(400).json({ error: 'missing fields' });
  verifyChallenge(String(wallet), String(nonce), String(signature));

  let user = db.prepare('SELECT * FROM users WHERE wallet = ?').get(String(wallet));
  let isNew = false;
  if (!user) {
    let code = '';
    let tries = 0;
    do {
      code = generateInviteCode();
      tries += 1;
    } while (tries < 50 && db.prepare('SELECT 1 FROM users WHERE code = ?').get(code));
    db.prepare('INSERT INTO users (wallet, code) VALUES (?, ?)').run(String(wallet), code);
    user = db.prepare('SELECT * FROM users WHERE wallet = ?').get(String(wallet));
    isNew = true;
    bindInvite(user.id, inviteCode);
  }

  res.json({ token: signToken(user), user: publicUser(user), isNew });
}));

export default router;