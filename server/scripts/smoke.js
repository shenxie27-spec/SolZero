import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import nacl from 'tweetnacl';
import bs58 from 'bs58';
import {
  Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction,
  getConnection, buildCheckinTransaction, classifyAccounts, buildCleanupTransactions,
  createRawTokenAccount, createTestMint
} from 'solzero-core';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = 'http://127.0.0.1:8787/api';
const connection = getConnection('localnet');

const walletPath = path.join(__dirname, '..', '..', 'core', 'scripts', 'devnet-wallet.json');
const kpA = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(walletPath, 'utf8'))));
const kpB = Keypair.generate();

async function call(pathname, opts = {}) {
  const res = await fetch(API + pathname, {
    method: opts.method || 'GET',
    headers: { 'Content-Type': 'application/json', ...(opts.token ? { Authorization: 'Bearer ' + opts.token } : {}) },
    body: opts.body ? JSON.stringify(opts.body) : undefined
  });
  const json = await res.json();
  return { status: res.status, json };
}

async function login(kp, inviteCode) {
  const wallet = kp.publicKey.toBase58();
  const ch = await call('/auth/challenge', { method: 'POST', body: { wallet } });
  const sig = bs58.encode(nacl.sign.detached(Buffer.from(ch.json.message, 'utf8'), kp.secretKey));
  const auth = await call('/auth/verify', { method: 'POST', body: { wallet, nonce: ch.json.nonce, signature: sig, inviteCode } });
  if (auth.status !== 200) throw new Error('login failed: ' + JSON.stringify(auth.json));
  return { wallet, token: auth.json.token, code: auth.json.user.code, isNew: auth.json.isNew };
}

async function sendTx(tx, kp) {
  if (tx.constructor && tx.constructor.name === 'VersionedTransaction') { tx.sign([kp]); } else { tx.sign(kp); }
  const sig = await connection.sendRawTransaction(tx.serialize());
  await connection.confirmTransaction(sig, 'confirmed');
  return sig;
}

async function doCheckin(kp, token) {
  const today = new Date().toISOString().slice(0, 10);
  const blockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
  const built = buildCheckinTransaction({ owner: kp.publicKey.toBase58(), date: today, recentBlockhash: blockhash });
  const sig = await sendTx(built.transaction, kp);
  const report = await call('/checkin/report', { method: 'POST', token, body: { signature: sig } });
  console.log('  checkin:', report.status, JSON.stringify(report.json));
  return report.json;
}

async function doCleanup(kp, token, accountCount) {
  const mint = await createTestMint(connection, kp, kp.publicKey, 0);
  const accounts = [];
  for (let i = 0; i < accountCount; i++) {
    accounts.push(await createRawTokenAccount(connection, kp, mint, kp.publicKey));
  }
  const scan = await classifyAccounts(connection, kp.publicKey);
  const blockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
  const built = buildCleanupTransactions({ empty: scan.empty, dust: scan.dust, owner: kp.publicKey, recentBlockhash: blockhash });
  const signatures = [];
  for (const tx of built.transactions) signatures.push(await sendTx(tx, kp));
  const report = await call('/cleanup/report', { method: 'POST', token, body: { signatures } });
  console.log('  cleanup:', report.status, JSON.stringify(report.json));
  return report.json;
}

console.log('[1] login A');
const a = await login(kpA);
console.log('  A wallet:', a.wallet, 'code:', a.code, 'isNew:', a.isNew);

console.log('[2] A checkin');
await doCheckin(kpA, a.token);

console.log('[3] A cleanup (2 empty accounts)');
await doCleanup(kpA, a.token, 2);

console.log('[4] fund B from A');
const fundBlockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
const fundTx = new Transaction({ recentBlockhash: fundBlockhash, feePayer: kpA.publicKey }).add(SystemProgram.transfer({
  fromPubkey: kpA.publicKey,
  toPubkey: kpB.publicKey,
  lamports: 300000000
}));
await sendTx(fundTx, kpA);
console.log('  B balance:', await connection.getBalance(kpB.publicKey));

console.log('[5] login B with invite code', a.code);
const b = await login(kpB, a.code);
console.log('  B wallet:', b.wallet, 'code:', b.code, 'isNew:', b.isNew);

console.log('[6] B cleanup (8 empty accounts)');
await doCleanup(kpB, b.token, 8);

console.log('[7] A invite overview (expect L1 bonus)');
const meA = await call('/me', { token: a.token });
console.log('  A:', JSON.stringify({ points: meA.json.user.points, invites: { l1Count: meA.json.invites.l1Count, l2Count: meA.json.invites.l2Count, earned: meA.json.invites.earned } }));

console.log('[8] leaderboard');
const lb = await call('/leaderboard');
console.log('  rows:', JSON.stringify(lb.json.rows));

console.log('[9] delete B account (policy)');
const del = await call('/account', { method: 'DELETE', token: b.token });
console.log('  delete:', del.status, JSON.stringify(del.json));

console.log('SMOKE OK');