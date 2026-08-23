import { Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import { createInitializeAccountInstruction, createInitializeMint2Instruction } from '@solana/spl-token';
import { TOKEN_PROGRAM_ID } from './config.js';

export async function createRawTokenAccount(connection, payer, mint, owner, programId = TOKEN_PROGRAM_ID) {
  const kp = Keypair.generate();
  const lamports = await connection.getMinimumBalanceForRentExemption(165);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: kp.publicKey,
      space: 165,
      lamports,
      programId
    }),
    createInitializeAccountInstruction(kp.publicKey, mint, owner, programId)
  );
  await sendAndConfirmTransaction(connection, tx, [payer, kp], 'confirmed');
  return kp.publicKey;
}

export async function createTestMint(connection, payer, authority, decimals = 0, programId = TOKEN_PROGRAM_ID) {
  const kp = Keypair.generate();
  const lamports = await connection.getMinimumBalanceForRentExemption(82);
  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: kp.publicKey,
      space: 82,
      lamports,
      programId
    }),
    createInitializeMint2Instruction(kp.publicKey, decimals, authority, null, programId)
  );
  await sendAndConfirmTransaction(connection, tx, [payer, kp], 'confirmed');
  return kp.publicKey;
}