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

export function fmtAddress(address) {
  const s = String(address || '');
  const parts = [];
  for (let i = 0; i < s.length; i += 4) parts.push(s.slice(i, i + 4));
  return parts.join(' ');
}

export function fmtPointsNum(n) {
  const v = Number(n);
  if (!Number.isFinite(v)) return '0';
  if (Number.isInteger(v)) return String(v);
  return String(Math.round(v * 10) / 10);
}

export function fmtAmount(value, maxDigits = 6) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '0';
  if (n === 0) return '0';
  if (Math.abs(n) < 0.000001) return '<0.000001';
  const str = n.toString();
  if (str.includes('.') && str.split('.')[1].length > maxDigits) {
    return n.toPrecision(maxDigits);
  }
  return str;
}
