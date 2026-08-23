import { AccountLayout, getMint } from '@solana/spl-token';
import { PublicKey } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, DUST_USD_THRESHOLD, RENT_PER_TOKEN_ACCOUNT } from './config.js';
import { getUsdPrices } from './price.js';

function toBig(amount) {
  return typeof amount === 'bigint' ? amount : BigInt(amount.toString());
}

export async function fetchTokenAccounts(connection, owner) {
  const ownerKey = owner instanceof PublicKey ? owner : new PublicKey(owner);
  const rows = [];
  for (const programId of [TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID]) {
    const res = await connection.getTokenAccountsByOwner(ownerKey, { programId }, 'confirmed');
    for (const item of res.value) {
      let decoded;
      try {
        decoded = AccountLayout.decode(item.account.data);
      } catch (err) {
        continue;
      }
      rows.push({
        pubkey: item.pubkey.toBase58(),
        mint: new PublicKey(decoded.mint).toBase58(),
        program: programId.equals(TOKEN_2022_PROGRAM_ID) ? 'token2022' : 'token',
        amount: toBig(decoded.amount),
        lamports: Number(item.account.lamports),
        delegateOption: decoded.delegateOption,
        state: decoded.state
      });
    }
  }
  return rows;
}

export async function classifyAccounts(connection, owner, opts = {}) {
  const dustThreshold = opts.dustThreshold ?? DUST_USD_THRESHOLD;
  const rows = await fetchTokenAccounts(connection, owner);

  const withBalance = rows.filter((r) => r.amount > 0n);
  const mints = [...new Set(withBalance.map((r) => r.mint))];

  let prices = {};
  if (mints.length > 0) {
    try {
      prices = await getUsdPrices(mints, opts.fetchImpl || fetch);
    } catch (err) {
      prices = {};
    }
  }

  const decimalsCache = new Map();
  async function decimalsOf(mint) {
    if (decimalsCache.has(mint)) return decimalsCache.get(mint);
    let d = 0;
    try {
      const info = await getMint(connection, new PublicKey(mint), 'confirmed');
      d = info.decimals;
    } catch (err) {
      d = 0;
    }
    decimalsCache.set(mint, d);
    return d;
  }

  const empty = [];
  const dust = [];
  let emptyLamports = 0;
  let dustLamports = 0;

  for (const row of rows) {
    if (row.amount === 0n) {
      const item = {
        ...row,
        amountUi: '0',
        usdValue: 0,
        needsRevoke: row.delegateOption === 1,
        reason: 'empty',
        kind: 'empty'
      };
      empty.push(item);
      emptyLamports += row.lamports;
    } else {
      const decimals = await decimalsOf(row.mint);
      const amountUi = Number(row.amount) / Math.pow(10, decimals);
      const price = prices[row.mint];
      const usdValue = typeof price === 'number' ? amountUi * price : 0;
      if (usdValue < dustThreshold) {
        const item = {
          ...row,
          decimals,
          amountUi,
          usdValue: typeof price === 'number' ? usdValue : null,
          hasPrice: typeof price === 'number',
          needsRevoke: row.delegateOption === 1,
          reason: 'dust',
          kind: 'dust'
        };
        dust.push(item);
        dustLamports += row.lamports;
      }
    }
  }

  return {
    empty,
    dust,
    totals: {
      emptyCount: empty.length,
      dustCount: dust.length,
      emptyLamports,
      dustLamports,
      totalLamports: emptyLamports + dustLamports,
      totalCount: empty.length + dust.length,
      rentPerAccount: RENT_PER_TOKEN_ACCOUNT
    }
  };
}