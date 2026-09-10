import { Router } from 'express';
import { db } from '../db.js';
import { handle } from '../middleware.js';

const router = Router();

function maskWallet(wallet) {
  if (!wallet || wallet.length < 12) return wallet;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

router.get('/leaderboard', handle((req, res) => {
  const rows = db.prepare('SELECT wallet, points FROM users ORDER BY points DESC, id ASC LIMIT 50').all();
  res.json({
    rows: rows.map((r, i) => ({
      rank: i + 1,
      wallet: maskWallet(r.wallet),
      points: Math.round(Number(r.points) * 10) / 10
    }))
  });
}));

export default router;
