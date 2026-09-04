import { SOL_MINT } from './config.js';

const GECKO_PRICE_API = 'https://api.geckoterminal.com/api/v2/simple/networks/solana/token_price/';
const JUPITER_PRICE_API = 'https://api.jup.ag/price/v2';
const COINBASE_SOL_PRICE_API = 'https://api.coinbase.com/v2/prices/SOL-USD/spot';

function toNumber(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value !== '') {
    const num = Number(value);
    if (Number.isFinite(num)) return num;
  }
  return null;
}

export async function getUsdPrices(mints, fetchImpl = fetch) {
  const ids = [...new Set(mints)];
  if (ids.length === 0) return {};
  const out = {};

  try {
    const url = `${GECKO_PRICE_API}${encodeURIComponent(ids.join(','))}`;
    const res = await fetchImpl(url, { headers: { 'user-agent': 'solzero/0.1' } });
    if (res.ok) {
      const json = await res.json();
      const prices = json.data && json.data.attributes && json.data.attributes.token_prices;
      if (prices) {
        for (const mint of ids) {
          const value = toNumber(prices[mint]);
          if (value !== null) out[mint] = value;
        }
      }
    }
  } catch (err) {
    /* fall through to Jupiter */
  }

  const missing = ids.filter((m) => out[m] === undefined);
  if (missing.length > 0) {
    try {
      const url = `${JUPITER_PRICE_API}?ids=${encodeURIComponent(missing.join(','))}&showExtraInfo=true`;
      const res = await fetchImpl(url, { headers: { 'user-agent': 'solzero/0.1' } });
      if (res.ok) {
        const json = await res.json();
        const data = json && json.data;
        for (const mint of missing) {
          const raw = data && data[mint] && data[mint].price;
          const value = toNumber(raw);
          if (value !== null) out[mint] = value;
        }
      }
    } catch (err) {
      /* ignore */
    }
  }

  if (Object.keys(out).length === 0 && ids.length > 0) {
    throw new Error('price api unavailable');
  }
  return out;
}

export async function getSolUsdPrice(fetchImpl = fetch) {
  const override = Number(process.env.SOLZERO_SOL_USD);
  if (Number.isFinite(override) && override > 0) return override;
  const prices = await getUsdPrices([SOL_MINT], fetchImpl);
  const price = prices[SOL_MINT];
  if (typeof price === 'number') return price;
  const res = await fetchImpl(COINBASE_SOL_PRICE_API, { headers: { 'user-agent': 'solzero/0.1' } });
  if (!res.ok) throw new Error(`sol price fallback status ${res.status}`);
  const json = await res.json();
  const amount = toNumber(json.data && json.data.amount);
  if (amount === null) throw new Error('SOL price unavailable');
  return amount;
}
