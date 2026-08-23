import bs58 from 'bs58';
import { classifyAccounts, buildCleanupTransactions, pointsForUsd } from '../../core/src/index.js';
import { API_URL } from './config';

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

export function buildCleanup(walletAddress, selectedItems, recentBlockhash) {
  const empty = selectedItems.filter((item) => item.kind === 'empty');
  const dust = selectedItems.filter((item) => item.kind === 'dust');
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