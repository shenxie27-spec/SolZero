import { Keypair, PublicKey, LAMPORTS_PER_SOL, sendAndConfirmTransaction, SystemProgram, Transaction } from '@solana/web3.js';
import { createMint, mintTo, createInitializeAccountInstruction, TOKEN_2022_PROGRAM_ID, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getConnection, classifyAccounts, buildCleanupTransactions, verifyCleanupSignatures, getSolUsdPrice, pointsForUsd } from '../src/index.js';

async function createRawTokenAccount(connection, payer, mint, owner, programId) {
  const kp = Keypair.generate();
  const lamports = await connection.getMinimumBalanceForRentExemption(165);
  const tx = new Transaction().add(
    SystemProgram.createAccount({ fromPubkey: payer.publicKey, newAccountPubkey: kp.publicKey, space: 165, lamports, programId }),
    createInitializeAccountInstruction(kp.publicKey, mint, owner, programId)
  );
  await sendAndConfirmTransaction(connection, tx, [payer, kp], 'confirmed');
  return kp.publicKey;
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WALLET_PATH = path.join(__dirname, 'devnet-wallet.json');
const connection = getConnection(process.env.SOLZERO_CLUSTER || 'localnet');

function loadOrCreateWallet() {
  if (fs.existsSync(WALLET_PATH)) {
    const arr = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf8'));
    return Keypair.fromSecretKey(Uint8Array.from(arr));
  }
  const kp = Keypair.generate();
  fs.writeFileSync(WALLET_PATH, JSON.stringify(Array.from(kp.secretKey)));
  console.log('[demo] new devnet wallet created:', kp.publicKey.toBase58());
  return kp;
}

async function ensureFunded(kp, minLamports) {
  const bal = await connection.getBalance(kp.publicKey);
  if (bal < minLamports) {
    console.log('[demo] requesting airdrop...');
    const sig = await connection.requestAirdrop(kp.publicKey, 2 * LAMPORTS_PER_SOL);
    await connection.confirmTransaction(sig, 'confirmed');
    console.log('[demo] airdrop done, balance:', await connection.getBalance(kp.publicKey));
  }
}

async function main() {
  const wallet = loadOrCreateWallet();
  await ensureFunded(wallet, LAMPORTS_PER_SOL);
  const owner = wallet.publicKey;

  const mint = await createMint(connection, wallet, wallet.publicKey, null, 2, undefined, 'confirmed');
  console.log('[demo] token mint:', mint.toBase58());

  const ata1 = await createRawTokenAccount(connection, wallet, mint, wallet.publicKey, TOKEN_PROGRAM_ID);
  const ata2 = await createRawTokenAccount(connection, wallet, mint, wallet.publicKey, TOKEN_PROGRAM_ID);
  const ata3 = await createRawTokenAccount(connection, wallet, mint, wallet.publicKey, TOKEN_PROGRAM_ID);
  await mintTo(connection, wallet, mint, ata3, wallet, 10, [], 'confirmed');

  const mint22 = await createMint(connection, wallet, wallet.publicKey, null, 0, undefined, 'confirmed', TOKEN_2022_PROGRAM_ID);
  await createRawTokenAccount(connection, wallet, mint22, wallet.publicKey, TOKEN_2022_PROGRAM_ID);
  console.log('[demo] token-2022 mint:', mint22.toBase58());

  console.log('[demo] scanning...');
  const scan = await classifyAccounts(connection, owner);
  console.log('[demo] scan result: empty=' + scan.empty.length + ' dust=' + scan.dust.length + ' totalLamports=' + scan.totals.totalLamports);

  const blockhash = (await connection.getLatestBlockhash('confirmed')).blockhash;
  const built = buildCleanupTransactions({ empty: scan.empty, dust: scan.dust, owner, recentBlockhash: blockhash });
  console.log('[demo] built', built.transactions.length, 'transaction(s)');
  console.log('[demo] breakdown:', JSON.stringify(built.breakdown));

  const signatures = [];
  for (const tx of built.transactions) {
    tx.sign(wallet);
    const sig = await connection.sendRawTransaction(tx.serialize(), { skipPreflight: false });
    signatures.push(sig);
    console.log('[demo] sent', sig);
    await connection.confirmTransaction(sig, 'confirmed');
  }

  console.log('[demo] verifying on-chain...');
  const verified = await verifyCleanupSignatures(connection, signatures);
  for (const v of verified) {
    console.log('[demo] verify:', JSON.stringify(v));
  }

  const solPrice = await getSolUsdPrice();
  const grossUsd = built.breakdown.recoveredLamports / LAMPORTS_PER_SOL * solPrice;
  const points = pointsForUsd(grossUsd);
  console.log('[demo] SOL price: $' + solPrice);
  console.log('[demo] gross: $' + grossUsd.toFixed(4) + ' -> points: ' + points);

  const balance = await connection.getBalance(owner);
  console.log('[demo] final wallet balance: ' + balance / LAMPORTS_PER_SOL + ' SOL');
  console.log('[demo] ALL OK');
}

main().catch((err) => {
  console.error('[demo] FAILED:', err);
  process.exit(1);
});