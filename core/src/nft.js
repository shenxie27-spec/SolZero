import bs58 from 'bs58';
import { PublicKey, Transaction, TransactionInstruction, ComputeBudgetProgram, SystemProgram } from '@solana/web3.js';
import { TREASURY, CNF_BURN_FEE_LAMPORTS } from './config.js';

export const BUBBLEGUM_PROGRAM_ID = new PublicKey('BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY');
export const BUBBLEGUM_BURN_DISCRIMINATOR = [116, 110, 29, 56, 107, 219, 42, 93];

const COMPRESSION_PROGRAM_ID = new PublicKey('cmtDvXumGCrqC1Age74AVPhSRVXJMd8PJS91L8KbNCK');
const NOOP_PROGRAM_ID = new PublicKey('noopb9bkMVfRPU8AsbpTUg8AQkHtKwMYZiFUjNRtMmV');

function hexToBytes(hex) {
  const s = String(hex || '').replace(/^0x/i, '');
  const out = new Uint8Array(Math.ceil(s.length / 2));
  for (let i = 0; i < out.length; i += 1) {
    out[i] = parseInt(s.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function hashBytes(value) {
  const s = String(value || '').replace(/^0x/i, '');
  if (s.length === 64 && /^[0-9a-fA-F]+$/.test(s)) return Array.from(hexToBytes(s));
  const out = Array.from(bs58.decode(s));
  if (out.length !== 32) throw new Error(`invalid 32-byte hash (${out.length} bytes)`);
  return out;
}

export function buildCnfBurnInstruction({ owner, asset, proofData }) {
  const tree = new PublicKey(asset.compression.tree);
  const treeAuthority = PublicKey.findProgramAddressSync([tree.toBuffer()], BUBBLEGUM_PROGRAM_ID)[0];
  const ownerKey = owner instanceof PublicKey ? owner : new PublicKey(owner);

  const root = hashBytes(proofData.root);
  const dataHash = hashBytes(asset.compression.data_hash);
  const creatorHash = hashBytes(asset.compression.creator_hash);
  const nonce = BigInt(Number(asset.compression.leaf_id || 0));
  const index = Number(asset.compression.leaf_id || 0);

  const data = Buffer.alloc(8 + 32 + 32 + 32 + 8 + 4);
  Buffer.from(BUBBLEGUM_BURN_DISCRIMINATOR).copy(data, 0);
  Buffer.from(root).copy(data, 8);
  Buffer.from(dataHash).copy(data, 40);
  Buffer.from(creatorHash).copy(data, 72);
  data.writeBigUInt64LE(nonce, 104);
  data.writeUInt32LE(index, 112);

  const keys = [
    { pubkey: treeAuthority, isWritable: false, isSigner: false },
    { pubkey: ownerKey, isWritable: false, isSigner: false },
    { pubkey: ownerKey, isWritable: false, isSigner: false },
    { pubkey: tree, isWritable: true, isSigner: false },
    { pubkey: NOOP_PROGRAM_ID, isWritable: false, isSigner: false },
    { pubkey: COMPRESSION_PROGRAM_ID, isWritable: false, isSigner: false },
    { pubkey: PublicKey.default, isWritable: false, isSigner: false }
  ];
  for (const p of proofData.proof || []) {
    keys.push({ pubkey: new PublicKey(p), isWritable: false, isSigner: false });
  }

  return new TransactionInstruction({ programId: BUBBLEGUM_PROGRAM_ID, keys, data });
}

export function buildCnfBurnTransactions({ owner, instructions, recentBlockhash, perTx = 1, feeWallet = TREASURY, feePerBurn = CNF_BURN_FEE_LAMPORTS }) {
  const ownerKey = owner instanceof PublicKey ? owner : new PublicKey(owner);
  const feeWalletKey = feeWallet instanceof PublicKey ? feeWallet : new PublicKey(feeWallet);
  const transactions = [];
  const burnCounts = [];

  for (let i = 0; i < instructions.length; i += perTx) {
    const chunk = instructions.slice(i, i + perTx);
    const fee = chunk.length * feePerBurn;
    const tx = new Transaction({ recentBlockhash, feePayer: ownerKey });
    tx.add(ComputeBudgetProgram.setComputeUnitLimit({ units: 300000 }));
    for (const ix of chunk) tx.add(ix);
    if (fee > 0) {
      tx.add(SystemProgram.transfer({ fromPubkey: ownerKey, toPubkey: feeWalletKey, lamports: fee }));
    }
    transactions.push(tx);
    burnCounts.push(chunk.length);
  }

  return { transactions, burnCounts };
}
