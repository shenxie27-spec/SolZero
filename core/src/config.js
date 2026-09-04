import { PublicKey } from '@solana/web3.js';

export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
export const MEMO_PROGRAM_ID = new PublicKey('MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr');
export const SYSTEM_PROGRAM_ID = new PublicKey('11111111111111111111111111111111');
export const SOL_MINT = 'So11111111111111111111111111111111111111112';

export const TREASURY = new PublicKey(process.env.SOLZERO_TREASURY || 'B5FhC46zHEcurfhy7mn88jyq7GvTS73qpZ2R9aUVcKJe');
export const RENT_PER_TOKEN_ACCOUNT = 2039280;
export const DUST_USD_THRESHOLD = 1;
export const FEE_RATE = 0.1;
export const POINTS_PER_USD = 10;
export const CLOSES_PER_TX = 8;
export const COMPUTE_UNIT_LIMIT = 300000;
export const CNF_BURN_FEE_LAMPORTS = 5000;
export const CNF_BURN_POINTS = 0.1;

export const CLUSTERS = {
  localnet: 'http://127.0.0.1:8899',
  devnet: process.env.SOLZERO_DEVNET_RPC || 'https://api.devnet.solana.com',
  'mainnet-beta': process.env.SOLZERO_MAINNET_RPC || 'https://api.mainnet-beta.solana.com'
};

export function pointsForUsd(usd) {
  return Math.floor(usd * POINTS_PER_USD);
}
