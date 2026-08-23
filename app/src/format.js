import { LAMPORTS_PER_SOL } from '../../core/src/index.js';

export function lamportsToSol(lamports) {
  return (Number(lamports) || 0) / LAMPORTS_PER_SOL;
}

export function fmtSol(lamports, digits = 4) {
  return lamportsToSol(lamports).toFixed(digits);
}

export function fmtUsd(value, digits = 2) {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—';
  return '$' + value.toFixed(digits);
}

export function shortWallet(wallet) {
  if (!wallet || wallet.length < 12) return wallet || '';
  return wallet.slice(0, 6) + '…' + wallet.slice(-4);
}