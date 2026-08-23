import { Router } from 'express';
import { getSolUsdPrice, getUsdPrices } from 'solzero-core';
import { handle } from '../middleware.js';

const router = Router();
let cache = { price: null, at: 0 };
const pricesCache = new Map();

router.get('/price', handle(async (req, res) => {
  if (!cache.price || Date.now() - cache.at > 60000) {
    cache = { price: await getSolUsdPrice(), at: Date.now() };
  }
  res.json({ solUsd: cache.price, at: cache.at });
}));

router.get('/prices', handle(async (req, res) => {
  const mints = String(req.query.mints || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 60);
  if (mints.length === 0) return res.json({ prices: {}, at: Date.now() });
  const key = [...new Set(mints)].sort().join(',');
  const hit = pricesCache.get(key);
  if (hit && Date.now() - hit.at < 60000) return res.json({ prices: hit.prices, at: hit.at });
  const prices = await getUsdPrices(mints);
  pricesCache.set(key, { prices, at: Date.now() });
  if (pricesCache.size > 100) pricesCache.delete(pricesCache.keys().next().value);
  res.json({ prices, at: Date.now() });
}));

export default router;