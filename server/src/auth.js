import crypto from 'node:crypto';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import jwt from 'jsonwebtoken';
import { db } from './db.js';
import { config } from './config.js';

const NONCE_TTL_MS = 10 * 60 * 1000;

export function generateInviteCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  const bytes = crypto.randomBytes(8);
  for (let i = 0; i < 8; i++) code += alphabet[bytes[i] % alphabet.length];
  return code;
}

export function buildChallengeMessage(wallet, nonce) {
  const issued = new Date().toISOString();
  return [
    'Welcome to SolZero',
    '',
    'Sign this message to log in. No transaction, no fee.',
    '',
    `Wallet: ${wallet}`,
    `Nonce: ${nonce}`,
    `Issued: ${issued}`
  ].join('\n');
}

export function createChallenge(wallet) {
  db.prepare('DELETE FROM auth_nonces WHERE expires_at < ?').run(Date.now());
  const nonce = crypto.randomBytes(24).toString('hex');
  const message = buildChallengeMessage(wallet, nonce);
  db.prepare('INSERT INTO auth_nonces (nonce, wallet, message, expires_at) VALUES (?, ?, ?, ?)')
    .run(nonce, wallet, message, Date.now() + NONCE_TTL_MS);
  return { nonce, message };
}

export function verifySignature(wallet, signatureB58, message) {
  try {
    const pub = bs58.decode(wallet);
    const sig = bs58.decode(signatureB58);
    if (pub.length !== 32 || sig.length !== 64) return false;
    return nacl.sign.detached.verify(Buffer.from(message, 'utf8'), sig, pub);
  } catch (err) {
    return false;
  }
}

export function verifyChallenge(wallet, nonce, signatureB58) {
  const row = db.prepare('SELECT * FROM auth_nonces WHERE nonce = ? AND wallet = ?').get(nonce, wallet);
  if (!row) throw Object.assign(new Error('nonce not found or expired'), { status: 401 });
  if (row.expires_at < Date.now()) throw Object.assign(new Error('nonce expired'), { status: 401 });
  if (!verifySignature(wallet, signatureB58, row.message)) {
    throw Object.assign(new Error('signature invalid'), { status: 401 });
  }
  db.prepare('DELETE FROM auth_nonces WHERE nonce = ?').run(nonce);
  return true;
}

export function signToken(user) {
  return jwt.sign({ uid: user.id, wallet: user.wallet }, config.jwtSecret, { expiresIn: '30d' });
}

export function authUserFromToken(token) {
  try {
    const payload = jwt.verify(token, config.jwtSecret);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.uid);
    if (!user) return null;
    return user;
  } catch (err) {
    return null;
  }
}

export function bindInvite(userId, inviteCode) {
  if (!inviteCode || typeof inviteCode !== 'string') return null;
  const inviter = db.prepare('SELECT * FROM users WHERE code = ?').get(inviteCode.trim().toUpperCase());
  if (!inviter || inviter.id === userId) return null;
  const existing = db.prepare('SELECT * FROM referrals WHERE downline_id = ? AND level = 1').get(userId);
  if (existing) return null;
  const cycle = db.prepare('SELECT 1 FROM referrals WHERE referrer_id = ? AND downline_id = ?').get(userId, inviter.id);
  if (cycle) return null;

  db.prepare('INSERT INTO referrals (referrer_id, downline_id, level) VALUES (?, ?, 1)')
    .run(inviter.id, userId);

  if (inviter.referrer_id && inviter.referrer_id !== userId) {
    db.prepare('INSERT INTO referrals (referrer_id, downline_id, level) VALUES (?, ?, 2)')
      .run(inviter.referrer_id, userId);
  }

  db.prepare('UPDATE users SET referrer_id = ? WHERE id = ?').run(inviter.id, userId);
  return { inviterId: inviter.id, l2Id: inviter.referrer_id || null };
}