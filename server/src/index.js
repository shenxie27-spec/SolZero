import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import './db.js';
import { handle } from './middleware.js';
import authRoutes from './routes/auth.js';
import meRoutes from './routes/me.js';
import checkinRoutes from './routes/checkin.js';
import taskRoutes from './routes/task.js';
import cleanupRoutes from './routes/cleanup.js';
import leaderboardRoutes from './routes/leaderboard.js';
import priceRoutes from './routes/price.js';
import tokenRoutes from './routes/token.js';
import legalRoutes from './routes/legal.js';
import errorRoutes from './routes/errors.js';
import adminRoutes from './routes/admin.js';

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '128kb' }));

app.use((req, res, next) => {
  res.set('Access-Control-Allow-Origin', '*');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

app.get('/api/health', (req, res) => {
  res.json({ ok: true, name: 'solzero-server', time: new Date().toISOString() });
});

const viewsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), 'views');
app.get('/admin', (req, res) => {
  res.type('html').sendFile(path.join(viewsDir, 'admin.html'));
});

app.use('/api/auth', authRoutes);
app.use('/api', meRoutes);
app.use('/api', checkinRoutes);
app.use('/api', taskRoutes);
app.use('/api', cleanupRoutes);
app.use('/api', leaderboardRoutes);
app.use('/api', priceRoutes);
app.use('/api', tokenRoutes);
app.use('/api', errorRoutes);
app.use('/api', adminRoutes);
app.use('/', legalRoutes);

const proxyUpstream = process.env.SOLZERO_PROXY_UPSTREAM || (config.cluster === 'localnet' ? 'http://127.0.0.1:8899' : 'https://api.mainnet-beta.solana.com');
app.post('/rpc', handle(async (req, res) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 25000);
  try {
    const upstream = await fetch(proxyUpstream, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body),
      signal: controller.signal
    });
    const text = await upstream.text();
    res.status(upstream.status).type('application/json').send(text);
  } catch (err) {
    res.status(502).json({ jsonrpc: '2.0', error: { code: -32603, message: 'rpc upstream unavailable' }, id: (req.body && req.body.id) || null });
  } finally {
    clearTimeout(timer);
  }
}));

app.use((req, res) => {
  res.status(404).json({ error: 'not found' });
});

app.use((err, req, res, next) => {
  const status = err.status || 500;
  if (status >= 500) console.error('[server]', err);
  res.status(status).json({ error: err.message || 'internal error' });
});

app.listen(config.port, '127.0.0.1', () => {
  console.log(`[solzero-server] listening on http://127.0.0.1:${config.port} (cluster=${config.cluster})`);
});

