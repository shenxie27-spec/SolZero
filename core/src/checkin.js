import { PublicKey, TransactionInstruction, Transaction } from '@solana/web3.js';
import { MEMO_PROGRAM_ID } from './config.js';

export const CHECKIN_PREFIX = 'SOLZERO|CHECKIN|';
export const TASK_PREFIX = 'SOLZERO|TASK|';

export function buildCheckinTransaction({ owner, date, recentBlockhash }) {
  const ownerPubkey = owner instanceof PublicKey ? owner : new PublicKey(owner);
  const text = `${CHECKIN_PREFIX}${date}`;
  const ix = new TransactionInstruction({
    keys: [{ pubkey: ownerPubkey, isSigner: false, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(text, 'utf8')
  });
  return {
    transaction: new Transaction({ recentBlockhash, feePayer: ownerPubkey }).add(ix),
    memo: text
  };
}

export function buildTaskTransaction({ owner, date, recentBlockhash }) {
  const ownerPubkey = owner instanceof PublicKey ? owner : new PublicKey(owner);
  const text = `${TASK_PREFIX}${date}`;
  const ix = new TransactionInstruction({
    keys: [{ pubkey: ownerPubkey, isSigner: false, isWritable: false }],
    programId: MEMO_PROGRAM_ID,
    data: Buffer.from(text, 'utf8')
  });
  return {
    transaction: new Transaction({ recentBlockhash, feePayer: ownerPubkey }).add(ix),
    memo: text
  };
}

export function parseCheckinMemo(tx) {
  const message = tx.transaction.message;
  const accountKeys = message.getAccountKeys ? message.getAccountKeys() : message.accountKeys;
  const instructions = message.compiledInstructions || message.instructions || [];
  const memos = [];
  for (const ix of instructions) {
    let programId;
    try {
      programId = accountKeys.get(ix.programIdIndex);
    } catch (err) {
      programId = accountKeys[ix.programIdIndex];
    }
    if (programId && programId.equals(MEMO_PROGRAM_ID) && ix.data && ix.data.length > 0) {
      memos.push(Buffer.from(ix.data).toString('utf8'));
    }
  }
  return memos;
}
