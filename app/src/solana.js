import bs58 from 'bs58';
import { Buffer } from 'buffer';
import { classifyAccounts, buildCleanupTransactions, pointsForUsd, parseCheckinMemo } from '../../core/src/index.js';
import { API_URL } from './config';
import { api } from './api';

async function priceProxyFetch(url, options = {}) {
  const marker = 'token_price/';
  const idx = url.indexOf(marker);
  if (idx === -1) return fetch(url, options);
  const mints = decodeURIComponent(url.slice(idx + marker.length));
  return fetch(`${API_URL}/api/prices?mints=${encodeURIComponent(mints)}`, {
    ...options,
    headers: { 'user-agent': 'solzero/0.1', ...(options.headers || {}) }
  });
}

export async function scanWallet(connection, walletAddress) {
  return classifyAccounts(connection, walletAddress, { fetchImpl: priceProxyFetch });
}

export async function fetchTokenMeta(mints) {
  const ids = [...new Set((mints || []).filter(Boolean))];
  if (ids.length === 0) return {};
  try {
    const r = await api('/tokens?mints=' + encodeURIComponent(ids.join(',')), { auth: false });
    return (r && r.tokens) || {};
  } catch (err) {
    return {};
  }
}

export async function simulateTransactions(transactions, apiUrl = API_URL) {
  for (const tx of transactions) {
    const raw = tx.serialize({ requireAllSignatures: false, verifySignatures: false });
    const encoded = Buffer.from(raw).toString('base64');
    const res = await fetch(`${apiUrl}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'simulateTransaction',
        params: [encoded, { sigVerify: false, commitment: 'confirmed', encoding: 'base64' }]
      })
    });
    const json = await res.json();
    if (!json || !json.result || json.result.value === undefined) {
      const message = (json && json.error && json.error.message) || 'RPC unavailable';
      throw new Error(message);
    }
    const err = json.result.value.err;
    if (err) {
      const rawLogs = json.result.value.logs || [];
      const logs = rawLogs.map((l) => (typeof l === 'string' ? Buffer.from(l, 'base64').toString('utf8') : String(l)));
      const failLog = logs.find((l) => /fail|error/i.test(l));
      throw new Error(JSON.stringify(err) + (failLog ? ' ' + failLog : ''));
    }
  }
  return true;
}

export async function fetchCnfAssets(owner) {
  try {
    const res = await fetch(`${API_URL}/rpc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'getAssetsByOwner',
        params: {
          ownerAddress: owner,
          sortBy: { sortBy: 'created', sortDirection: 'asc' },
          limit: 1000,
          page: 1,
          before: null,
          after: null,
          displayOptions: { showFungible: false }
        }
      })
    });
    const json = await res.json();
    const items = (json && json.result && json.result.items) || [];
    return items.filter((a) => !a.burnt && a.compression && a.compression.compressed);
  } catch (err) {
    return [];
  }
}

export async function fetchCnfProof(assetId) {
  const res = await fetch(`${API_URL}/rpc`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getAssetProof', params: [assetId] })
  });
  const json = await res.json();
  if (!json || !json.result) {
    const message = (json && json.error && json.error.message) || 'proof unavailable';
    throw new Error(message);
  }
  return json.result;
}

export function buildCleanup(walletAddress, selectedItems, recentBlockhash) {
  const empty = selectedItems.filter((item) => item.kind === 'empty');
  const dust = selectedItems.filter((item) => item.kind === 'dust' || item.kind === 'unknown');
  return buildCleanupTransactions({ empty, dust, owner: walletAddress, recentBlockhash });
}

export function estimatePoints(totalLamports, solUsd) {
  if (!solUsd || solUsd <= 0) return null;
  const usd = (totalLamports / 1e9) * solUsd;
  return pointsForUsd(usd);
}

export function encodeSignature(bytes) {
  return bs58.encode(bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes));
}

export async function findRecentMemoSignature(connection, walletAddress, expectedMemo, windowSec = 300) {
  try {
    const sigs = await connection.getSignaturesForAddress(walletAddress, { limit: 12 });
    const cutoff = Date.now() / 1000 - windowSec;
    for (const s of sigs) {
      if (!s.blockTime || s.blockTime < cutoff || s.err) continue;
      const tx = await connection.getTransaction(s.signature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });
      if (!tx || (tx.meta && tx.meta.err)) continue;
      const memos = parseCheckinMemo(tx);
      if (memos.includes(expectedMemo)) return s.signature;
    }
  } catch (err) {
    /* ignore */
  }
  return null;
}
