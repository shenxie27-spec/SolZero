import { createCloseAccountInstruction, createBurnInstruction, createRevokeInstruction } from '@solana/spl-token';
import { PublicKey, Transaction, SystemProgram, ComputeBudgetProgram } from '@solana/web3.js';
import { TREASURY, FEE_RATE, CLOSES_PER_TX, COMPUTE_UNIT_LIMIT } from './config.js';

export function buildCleanupTransactions({ empty = [], dust = [], owner, feeWallet, feeRate, recentBlockhash }) {
  const ownerPubkey = owner instanceof PublicKey ? owner : new PublicKey(owner);
  const feeWalletPubkey = feeWallet instanceof PublicKey ? feeWallet : new PublicKey(feeWallet || TREASURY);
  const rate = typeof feeRate === 'number' ? feeRate : FEE_RATE;

  const all = [];
  for (const item of empty) all.push({ ...item, kind: 'empty' });
  for (const item of dust) all.push({ ...item, kind: 'dust' });

  let recoveredLamports = 0;
  const instructions = [];
  let burnCount = 0;

  for (const item of all) {
    const account = new PublicKey(item.pubkey);
    const mint = new PublicKey(item.mint);
    const programId = new PublicKey(item.program === 'token2022'
      ? 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb'
      : 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
    const group = [];

    if (item.needsRevoke) {
      group.push(createRevokeInstruction(account, ownerPubkey, [], programId));
    }
    if (item.kind === 'dust') {
      group.push(createBurnInstruction(account, mint, ownerPubkey, BigInt(item.amount), [], programId));
      burnCount += 1;
    }
    group.push(createCloseAccountInstruction(account, ownerPubkey, ownerPubkey, [], programId));
    instructions.push(group);
    recoveredLamports += Number(item.lamports || 0);
  }

  const feeLamports = Math.floor(recoveredLamports * rate);

  if (instructions.length === 0) {
    throw new Error('没有可执行的清理项');
  }

  const transactions = [];
  const closePerTx = Math.max(1, CLOSES_PER_TX);
  const chunkCount = Math.max(1, Math.ceil(instructions.length / closePerTx));

  for (let i = 0; i < chunkCount; i++) {
    const chunk = instructions.slice(i * closePerTx, (i + 1) * closePerTx);
    if (chunk.length === 0) continue;
    const flat = [ComputeBudgetProgram.setComputeUnitLimit({ units: COMPUTE_UNIT_LIMIT })];
    for (const group of chunk) flat.push(...group);

    if (i === chunkCount - 1 && feeLamports > 0) {
      flat.push(SystemProgram.transfer({
        fromPubkey: ownerPubkey,
        toPubkey: feeWalletPubkey,
        lamports: feeLamports
      }));
    }

    transactions.push(new Transaction({ recentBlockhash, feePayer: ownerPubkey }).add(...flat));
  }

  return {
    transactions,
    breakdown: {
      emptyCount: empty.length,
      dustCount: dust.length,
      burnedCount: burnCount,
      recoveredLamports,
      feeLamports,
      netLamports: recoveredLamports - feeLamports,
      feeRate: rate,
      feeWallet: feeWalletPubkey.toBase58()
    }
  };
}