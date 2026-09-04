import { Router } from 'express';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import { config } from '../config.js';
import { PublicKey } from 'solzero-core';

const router = Router();

const MINT_RE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const META_TTL = 7 * 24 * 3600 * 1000;
const IMAGE_TTL = 30 * 24 * 3600 * 1000;
const MAX_BYTES = 12 * 1024 * 1024;
const METADATA_PROGRAM_ID = 'metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s';

const cacheDir = path.resolve(path.dirname(path.resolve(config.dbPath)), 'icon-cache');
const rpcUpstream = process.env.SOLZERO_PROXY_UPSTREAM || 'https://api.mainnet-beta.solana.com';
const execFileAsync = promisify(execFile);

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

function normalizeMeta(raw) {
  if (!raw || typeof raw !== 'object') return { symbol: null, name: null, imageUrl: null, animationUrl: null, miss: false, at: 0 };
  return {
    symbol: typeof raw.symbol === 'string' && raw.symbol ? raw.symbol : null,
    name: typeof raw.name === 'string' && raw.name ? raw.name : null,
    imageUrl: typeof raw.imageUrl === 'string' && raw.imageUrl ? raw.imageUrl : null,
    animationUrl: typeof raw.animationUrl === 'string' && raw.animationUrl ? raw.animationUrl : null,
    miss: !!raw.miss,
    at: typeof raw.at === 'number' ? raw.at : 0
  };
}

async function rpcJson(method, params) {
  const res = await fetchWithTimeout(rpcUpstream, 9000, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method, params })
  });
  if (!res.ok) throw new Error('rpc status ' + res.status);
  const json = await res.json();
  if (json.error) throw new Error('rpc error');
  return json.result;
}

function fetchWithTimeout(url, timeoutMs, init) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  return fetch(url, { ...init, headers: { ...(init && init.headers), 'user-agent': 'solzero/0.1' }, signal: controller.signal }).finally(() => clearTimeout(timer));
}

function toHttpUri(uri) {
  if (!uri) return null;
  let u = String(uri).trim();
  if (u.startsWith('ipfs://')) u = 'https://ipfs.io/ipfs/' + u.slice(7);
  if (u.startsWith('ar://')) u = 'https://arweave.net/' + u.slice(5);
  return /^https?:\/\//i.test(u) ? u : null;
}

function sanitize(str, maxLen = 24) {
  const s = String(str || '').replace(/[\x00-\x1f]/g, '').trim();
  return s.slice(0, maxLen) || null;
}

function extractUriStrings(buf, limit = 4) {
  const uris = [];
  const re = /(?:https?|ipfs|ar):\/\/[^\x00-\x20"<>\\]{8,300}/g;
  const text = buf.toString('utf8');
  let m;
  while ((m = re.exec(text)) && uris.length < limit) {
    let u = toHttpUri(m[0].replace(/["')\]}]+$/, '')) || m[0];
    if (!uris.includes(u)) uris.push(u);
  }
  return uris;
}

async function metaFromUri(uri) {
  try {
    const httpUri = toHttpUri(uri);
    if (!httpUri) return null;
    const res = await fetchWithTimeout(httpUri, 9000);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || typeof json !== 'object') return null;
    const symbol = sanitize(json.symbol, 16);
    const name = sanitize(json.name);
    const imageUrl = toHttpUri(json.image || json.image_url);
    const animationUrl = toHttpUri(json.animation_url);
    if (symbol || name || imageUrl || animationUrl) {
      return { symbol, name, imageUrl, animationUrl, miss: false };
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function resolveMetaOnChain(mint) {
  try {
    const programId = new PublicKey(METADATA_PROGRAM_ID);
    const mintKey = new PublicKey(mint);
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from('metadata'), programId.toBuffer(), mintKey.toBuffer()],
      programId
    );
    const info = await rpcJson('getAccountInfo', [pda.toBase58(), { encoding: 'base64' }]);
    if (info && info.value && info.value.data && info.value.data[0]) {
      const buf = Buffer.from(info.value.data[0], 'base64');
      if (buf.length >= 70) {
        let off = 65;
        const nameLen = buf.readUInt32LE(off); off += 4;
        const name = sanitize(buf.slice(off, off + nameLen).toString('utf8')); off += nameLen;
        const symbolLen = buf.readUInt32LE(off); off += 4;
        const symbol = sanitize(buf.slice(off, off + symbolLen).toString('utf8'), 16); off += symbolLen;
        const uriLen = buf.readUInt32LE(off); off += 4;
        const uri = toHttpUri(buf.slice(off, off + uriLen).toString('utf8'));
        if (uri) {
          const viaUri = await metaFromUri(uri);
          if (viaUri) {
            return {
              symbol: symbol || viaUri.symbol,
              name: name || viaUri.name,
              imageUrl: viaUri.imageUrl,
              animationUrl: viaUri.animationUrl,
              miss: false
            };
          }
        }
        if (symbol || name) return { symbol, name, imageUrl: null, animationUrl: null, miss: false };
      }
      for (const u of extractUriStrings(buf)) {
        const viaUri = await metaFromUri(u);
        if (viaUri && (viaUri.imageUrl || viaUri.symbol)) return viaUri;
      }
    }

    const mintInfo = await rpcJson('getAccountInfo', [mint, { encoding: 'base64' }]);
    if (mintInfo && mintInfo.value && mintInfo.value.data && mintInfo.value.data[0]) {
      const mbuf = Buffer.from(mintInfo.value.data[0], 'base64');
      for (let i = 0; i + 68 <= mbuf.length; i += 1) {
        if (mbuf.readUInt16LE(i) !== 18 || mbuf.readUInt16LE(i + 2) !== 64) continue;
        try {
          const addr = new PublicKey(mbuf.slice(i + 36, i + 68)).toBase58();
          const pAcc = await rpcJson('getAccountInfo', [addr, { encoding: 'base64' }]);
          if (pAcc && pAcc.value && pAcc.value.data && pAcc.value.data[0]) {
            const pb = Buffer.from(pAcc.value.data[0], 'base64');
            for (const u of extractUriStrings(pb)) {
              const viaUri = await metaFromUri(u);
              if (viaUri && (viaUri.imageUrl || viaUri.symbol)) return viaUri;
            }
          }
        } catch (err) {
          /* skip malformed pointer */
        }
      }
      for (const u of extractUriStrings(mbuf)) {
        const viaUri = await metaFromUri(u);
        if (viaUri && (viaUri.imageUrl || viaUri.symbol)) return viaUri;
      }
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function resolveMetaJupiter(mint) {
  try {
    const res = await fetchWithTimeout('https://tokens.jup.ag/token/' + mint, 9000);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json || !json.mint) return null;
    return {
      symbol: sanitize(json.symbol, 16),
      name: sanitize(json.name),
      imageUrl: toHttpUri(json.logoURI),
      miss: false
    };
  } catch (err) {
    return null;
  }
}

async function resolveMetaDas(mint) {
  try {
    const json = await rpcJson('getAsset', [mint]);
    const content = json && json.content;
    const meta = content && content.metadata;
    if (!meta) return null;
    const symbol = sanitize(meta.symbol, 16);
    const name = sanitize(meta.name);
    let imageUrl = toHttpUri(content.links && content.links.image);
    if (!imageUrl && Array.isArray(content.files) && content.files.length > 0) {
      imageUrl = toHttpUri(content.files[0].uri);
    }
    if (symbol || name || imageUrl) {
      return { symbol, name, imageUrl, miss: false };
    }
    return null;
  } catch (err) {
    return null;
  }
}

async function resolveMeta(mint) {
  const metaFile = path.join(cacheDir, mint + '.meta.json');
  const cached = normalizeMeta(await readMeta(metaFile));
  if (cached.at && Date.now() - cached.at < META_TTL && (cached.symbol || cached.imageUrl || cached.animationUrl || cached.miss)) {
    return cached;
  }

  let meta = { symbol: null, name: null, imageUrl: null, animationUrl: null, miss: false };
  try {
    const res = await fetchWithTimeout('https://api.geckoterminal.com/api/v2/networks/solana/tokens/' + mint, 9000);
    if (res.ok) {
      const json = await res.json();
      const a = json && json.data && json.data.attributes;
      if (a) {
        meta.symbol = a.symbol || null;
        meta.name = a.name || null;
        meta.imageUrl = a.image_url || null;
      }
    }
  } catch (err) {
    /* ignore, try next source */
  }

  if (!meta.symbol || !meta.imageUrl) {
    const jup = await resolveMetaJupiter(mint);
    if (jup) {
      meta.symbol = meta.symbol || jup.symbol;
      meta.name = meta.name || jup.name;
      meta.imageUrl = meta.imageUrl || jup.imageUrl;
    }
  }

  if (!meta.symbol || !meta.imageUrl) {
    const das = await resolveMetaDas(mint);
    if (das) {
      meta.symbol = meta.symbol || das.symbol;
      meta.name = meta.name || das.name;
      meta.imageUrl = meta.imageUrl || das.imageUrl;
    }
  }

  if (!meta.imageUrl) {
    const onchain = await resolveMetaOnChain(mint);
    if (onchain) {
      meta.symbol = meta.symbol || onchain.symbol;
      meta.name = meta.name || onchain.name;
      meta.imageUrl = meta.imageUrl || onchain.imageUrl;
      meta.animationUrl = meta.animationUrl || onchain.animationUrl;
    }
  }

  if (!meta.symbol && !meta.imageUrl && !meta.animationUrl) meta.miss = true;
  await writeMeta(metaFile, { ...meta, at: Date.now() });
  return meta;
}

async function resolveMetaBulk(mints) {
  const out = {};
  const todo = [];
  for (const mint of mints) {
    const metaFile = path.join(cacheDir, mint + '.meta.json');
    const cached = normalizeMeta(await readMeta(metaFile));
    if (cached.at && Date.now() - cached.at < META_TTL && (cached.symbol || cached.imageUrl || cached.animationUrl || cached.miss)) {
      out[mint] = cached;
    } else {
      todo.push(mint);
    }
  }

  for (let i = 0; i < todo.length; i += 4) {
    const batch = todo.slice(i, i + 4);
    const results = await Promise.all(
      batch.map(async (mint) => {
        const meta = await resolveMeta(mint);
        return [mint, meta];
      })
    );
    for (const [mint, meta] of results) {
      out[mint] = meta;
    }
  }
  return out;
}

async function serveImageFile(res, imgFile) {
  const buf = await fs.readFile(imgFile);
  const ct = sniffContentType(buf) || 'image/png';
  res.set('Cache-Control', 'public, max-age=604800, immutable');
  res.set('Content-Type', ct);
  res.send(buf);
}

async function extractVideoFrame(animUrl, mint) {
  const tmpDir = path.join(cacheDir, 'video-tmp');
  await fs.mkdir(tmpDir, { recursive: true });
  const inFile = path.join(tmpDir, mint + '.mp4');
  const outFile = path.join(tmpDir, mint + '.jpg');
  try {
    const res = await fetchWithTimeout(animUrl, 60000);
    if (!res.ok) return null;
    const data = Buffer.from(await res.arrayBuffer());
    if (data.length === 0 || data.length > 80 * 1024 * 1024) return null;
    await fs.writeFile(inFile, data);
    try {
      await execFileAsync('ffmpeg', ['-y', '-loglevel', 'error', '-i', inFile, '-frames:v', '1', '-vf', 'scale=256:-1', outFile], { timeout: 30000, maxBuffer: 1024 * 1024 });
    } catch (err) {
      return null;
    }
    const frame = await fs.readFile(outFile);
    if (frame.length === 0 || frame.length > MAX_BYTES) return null;
    return frame;
  } catch (err) {
    return null;
  } finally {
    await fs.rm(inFile, { force: true }).catch(() => {});
    await fs.rm(outFile, { force: true }).catch(() => {});
  }
}

router.get('/tokens', async (req, res) => {
  const mints = String(req.query.mints || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => MINT_RE.test(s))
    .slice(0, 60);
  if (mints.length === 0) return res.json({ tokens: {} });

  const metas = await resolveMetaBulk(mints);
  const tokens = {};
  for (const mint of mints) {
    const m = metas[mint] || { symbol: null, name: null, imageUrl: null, animationUrl: null, miss: false };
    tokens[mint] = { symbol: m.symbol, name: m.name, imageUrl: m.imageUrl, hasIcon: !!(m.imageUrl || m.animationUrl) };
  }
  res.json({ tokens });
});

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
    const meta = await resolveMeta(mint);
    let url = meta.imageUrl;
    if (!url && meta.animationUrl) {
      const frame = await extractVideoFrame(meta.animationUrl, mint);
      if (frame) {
        await fs.mkdir(cacheDir, { recursive: true });
        await fs.writeFile(imgFile, frame);
        res.set('Cache-Control', 'public, max-age=604800, immutable');
        res.type('image/jpeg');
        return res.send(frame);
      }
    }
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
    const upstreamType = (upstream.headers && upstream.headers.get && upstream.headers.get('content-type')) || '';
    const ct = /^image\//i.test(upstreamType) ? upstreamType.split(';')[0].trim().toLowerCase() : sniffContentType(buf);
    if (!ct) {
      return res.status(404).json({ error: 'unsupported image' });
    }
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(imgFile, buf);
    res.set('Cache-Control', 'public, max-age=604800, immutable');
    res.type(ct);
    return res.send(buf);
  } catch (err) {
    return res.status(404).json({ error: 'icon fetch failed' });
  }
});

router.get('/activity', async (req, res) => {
  const accounts = String(req.query.accounts || '')
    .split(',')
    .map((s) => s.trim())
    .filter((s) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s))
    .slice(0, 80);
  if (accounts.length === 0) return res.json({ activity: {} });

  const out = {};
  for (let i = 0; i < accounts.length; i += 8) {
    const batch = accounts.slice(i, i + 8);
    await Promise.all(batch.map(async (acc) => {
      try {
        const rows = await rpcJson('getSignaturesForAddress', [acc, { limit: 1 }]);
        const first = rows && rows[0];
        out[acc] = first && typeof first.blockTime === 'number' ? first.blockTime : null;
      } catch (err) {
        out[acc] = null;
      }
    }));
  }
  res.json({ activity: out });
});

router.get('/img', async (req, res) => {
  const url = String(req.query.url || '');
  if (!/^https?:\/\//i.test(url)) {
    return res.status(400).json({ error: 'bad url' });
  }
  const hash = createHash('sha1').update(url).digest('hex');
  const imgFile = path.join(cacheDir, 'img-' + hash);
  try {
    const st = await fs.stat(imgFile);
    if (st.size > 0 && st.size <= MAX_BYTES && Date.now() - st.mtimeMs < IMAGE_TTL) {
      return await serveImageFile(res, imgFile);
    }
  } catch (err) {
    /* no cached image yet */
  }
  try {
    const upstream = await fetchWithTimeout(url, 15000);
    if (!upstream.ok) {
      return res.status(404).json({ error: 'img fetch failed' });
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.length === 0 || buf.length > MAX_BYTES) {
      return res.status(404).json({ error: 'bad image' });
    }
    const upstreamType = (upstream.headers && upstream.headers.get && upstream.headers.get('content-type')) || '';
    const ct = /^image\//i.test(upstreamType) ? upstreamType.split(';')[0].trim().toLowerCase() : sniffContentType(buf);
    if (!ct) {
      return res.status(404).json({ error: 'unsupported image' });
    }
    await fs.mkdir(cacheDir, { recursive: true });
    await fs.writeFile(imgFile, buf);
    res.set('Cache-Control', 'public, max-age=604800, immutable');
    res.type(ct);
    return res.send(buf);
  } catch (err) {
    return res.status(404).json({ error: 'img fetch failed' });
  }
});

export default router;
