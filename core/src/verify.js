import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, SYSTEM_PROGRAM_ID, TREASURY, FEE_RATE } from './config.js';

const CLOSE_DISCRIMINATOR = 9;
const BURN_DISCRIMINATOR = 8;
const REVOKE_DISCRIMINATOR = 5;
const TRANSFER_DISCRIMINATOR = 2;

export async function verifyCleanupSignatures(connection, signatures, opts = {}) {
  const feeWallet = opts.feeWallet ? new PublicKey(opts.feeWallet) : TREASURY;
  const rate = typeof opts.feeRate === 'number' ? opts.feeRate : FEE_RATE;
  const results = [];

  for (const sig of signatures) {
    let tx = null;
    try {
      tx = await connection.getTransaction(sig, { commitment: 'confirmed', maxSupportedTransactionVersion: 0 });
    } catch (err) {
      results.push({ sig, ok: false, error: `fetch failed: ${err.message}` });
      continue;
    }

    if (!tx) {
      results.push({ sig, ok: false, error: 'not found' });
      continue;
    }
    if (tx.meta && tx.meta.err) {
      results.push({ sig, ok: false, error: 'transaction failed on-chain' });
      continue;
    }

    const message = tx.transaction.message;
    const accountKeys = message.getAccountKeys ? message.getAccountKeys() : message.accountKeys;
    const instructions = message.compiledInstructions || message.instructions || [];

    let recoveredLamports = 0;
    let feeLamports = 0;
    let closedCount = 0;
    let burnedCount = 0;
    let revokedCount = 0;

    for (const ix of instructions) {
      let programId;
      try {
        programId = accountKeys.get(ix.programIdIndex);
      } catch (err) {
        programId = accountKeys[ix.programIdIndex];
      }

      if (!programId) continue;
      const data = ix.data;
      if (!data || data.length === 0) continue;

      if (programId.equals(TOKEN_PROGRAM_ID) || programId.equals(TOKEN_2022_PROGRAM_ID)) {
        if (data[0] === CLOSE_DISCRIMINATOR) {
          const idx = ix.accountKeyIndexes ? ix.accountKeyIndexes[0] : ix.accounts[0];
          const before = tx.meta && tx.meta.preBalances ? tx.meta.preBalances[idx] : 0;
          recoveredLamports += Number(before || 0);
          closedCount += 1;
        } else if (data[0] === BURN_DISCRIMINATOR) {
          burnedCount += 1;
        } else if (data[0] === REVOKE_DISCRIMINATOR) {
          revokedCount += 1;
        }
      } else if (programId.equals(SYSTEM_PROGRAM_ID) && data[0] === TRANSFER_DISCRIMINATOR) {
        const destIdx = ix.accountKeyIndexes ? ix.accountKeyIndexes[1] : ix.accounts[1];
        let dest;
        try {
          dest = accountKeys.get(destIdx);
        } catch (err) {
          dest = accountKeys[destIdx];
        }
        if (dest && dest.equals(feeWallet)) {
          const buf = Buffer.from(data);
          feeLamports += Number(buf.readBigUInt64LE(4));
        }
      }
    }

    const expectedFee = Math.floor(recoveredLamports * rate);
    const ok = recoveredLamports > 0 && feeLamports >= expectedFee;
    results.push({
      sig,
      ok,
      recoveredLamports,
      feeLamports,
      expectedFee,
      closedCount,
      burnedCount,
      revokedCount,
      error: ok ? null : (recoveredLamports === 0 ? 'no closable accounts found in tx' : `fee mismatch: paid ${feeLamports}, expected >= ${expectedFee}`)
    });
  }

  return results;
}