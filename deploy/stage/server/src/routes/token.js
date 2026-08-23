import { Router } from 'express';
import { createReadStream, promises as fs } from 'node:fs';
import path from 'node:path';
import { config } from '../config.js';

const router = Router();

const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const META_TTL = 7 * 24 * 3600 * 1000;
const IMAGE_TTL = 30 * 24 * 3600 * 1000;
const MAX_BYTES = 600 * 1024;

const cacheDir = path.resolve(path.dirname(path.resolve(config.dbPath)), 'icon-cache');

function fetchWithTimeout(url, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, {
    headers: {
      'user-agent': 'solzero/0.1',
      accept: 'application/json,image/png,image/jpeg,image/webp,image/svg+xml,*/*'
    },
    signal: controller.signal
  }).finally(() => clearTimeout(timer));
}

function sniffContentType(buf) {
  if (buf.length >= 4 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return 'image/png';
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 6 && buf.slice(0, 4).toString('ascii') === 'RIFF' && buf.slice(8, 12).toString('ascii') === 'WEBP') return 'image/webp';
  if (buf.length >= 4 && buf[0] === 0x47 && buf[1] === 0x49 && buf[2] === 0x46) return 'image/gif';
  const head = buf.slice(0, 256).toString('utf8', 0, Math.min(buf.length, 256)).trimStart().toLowerCase();
  if (head.startsWith('<svg') || head.startsWith('<?xml')) return 'image/svg+xml';
  return null;
}

async function readMeta(metaFile) {
  try {
    return JSON.parse(await fs.readFile(metaFile, 'utf8'));
  } catch (err) {
    return null;
  }
}

async function writeMeta(metaFile, meta) {
  try {
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(metaFile, JSON.stringify(meta));
  } catch (err) {
    /* cache write failure is non-fatal */
  }
}

async function resolveImageUrl(mint) {
  const metaFile = path.join(cacheDir, mint + '.meta.json');
  const cached = await readMeta(metaFile);
  if (cached && Date.now() - cached.at < META_TTL) return cached.url || null;

  let url = null;
  try {
    const res = await fetchWithTimeout('https://api.geckoterminal.com/api/v2/networks/solana/tokens/' + mint, 9000);
    if (res.ok) {
      const json = await res.json();
      url = (json && json.data && json.data.attributes && json.data.attributes.image_url) || null;
    }
  } catch (err) {
    /* ignore */
  }
  if (!url) {
    try {
      const res = await fetchWithTimeout('https://api.dexscreener.com/latest/dex/tokens/' + mint, 9000);
      if (res.ok) {
        const json = await res.json();
        const pair = json && json.pairs && json.pairs[0];
        url = (pair && pair.baseToken && pair.baseToken.imageUrl) || (pair && pair.quoteToken && pair.quoteToken.imageUrl) || null;
      }
    } catch (err) {
      /* ignore */
    }
  }
  await writeMeta(metaFile, { url: url || null, at: Date.now() });
  return url;
}

async function serveImageFile(res, imgFile) {
  const metaFile = imgFile.replace(/\.img$/, '.meta.json');
  const meta = await readMeta(metaFile);
  res.set('Cache-Control', 'public, max-age=604800, immutable');
  res.set('Content-Type', (meta && meta.ct) || 'image/png');
  createReadStream(imgFile).pipe(res);
}

router.get('/token/:mint/icon', async (req, res) => {
  const { mint } = req.params;
  if (!MINT_RE.test(mint)) {
    return res.status(400).json({ error: 'bad mint' });
  }

  const imgFile = path.join(cacheDir, mint + '.img');
  try {
    const st = await fs.stat(imgFile);
    if (st.size > 0 && st.size <= MAX_BYTES && Date.now() - st.mtimeMs < IMAGE_TTL) {
      return await serveImageFile(res, imgFile);
    }
  } catch (err) {
    /* no cached image yet */
  }

  try {
    const url = await resolveImageUrl(mint);
    if (!url) {
      return res.status(404).json({ error: 'no icon' });
    }
    const upstream = await fetchWithTimeout(url, 12000);
    if (!upstream.ok) {
      return res.status(404).json({ error: 'icon fetch failed' });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_BYTES) {
      return res.status(404).json({ error: 'bad icon' });
    }
    const ct = sniffContentType(buf);
    if (!ct) {
      return res.status(404).json({ error: 'unsupported image' });
    }
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(imgFile, buf);
    await writeMeta(path.join(cacheDir, mint + '.meta.json'), { url, ct, at: Date.now() });
    res.set('Cache-Control', 'public, max-age=604800, immutable');
    res.type(ct);
    return res.send(buf);
  } catch (err) {
    return res.status(404).json({ error: 'icon fetch failed' });
  }
});

export default router;
