import { API_URLS, TIMEOUT_MEDIUM, TIMEOUT_LONG } from '@/config/api.js';
import {
  INVEST_AMOUNT,
  SBER_PRICE_2015,
  USD_RUB_2015,
  BTC_USD_2015,
  FEAR_GREED_LABELS,
} from '@/config/constants.js';
import type { InvestmentResult, InvestmentAsset, FearGreedIndex } from '@/types/index.js';

async function fetchSberPrice(): Promise<number | null> {
  try {
    const res = await fetch(API_URLS.MOEX_SBER, {
      signal: AbortSignal.timeout(TIMEOUT_LONG),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    // LAST is null when market is closed — fallback to PREVLEGALCLOSEPRICE
    const cols: string[] = data?.marketdata?.columns ?? [];
    const rows: any[][] = data?.marketdata?.data ?? [];
    if (!rows[0]) return null;
    const lastIdx = cols.indexOf('LAST');
    const prevIdx = cols.indexOf('PREVLEGALCLOSEPRICE');
    const price = rows[0][lastIdx] || rows[0][prevIdx];
    return typeof price === 'number' && price > 0 ? price : null;
  } catch {
    return null;
  }
}

async function fetchBtcUsd(): Promise<number | null> {
  try {
    const res = await fetch(API_URLS.COINGECKO_BTC, {
      signal: AbortSignal.timeout(TIMEOUT_LONG),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { bitcoin?: { usd?: number } };
    const price = data?.bitcoin?.usd;
    return typeof price === 'number' && price > 0 ? price : null;
  } catch {
    return null;
  }
}

export async function fetchFearGreedIndex(): Promise<FearGreedIndex | null> {
  try {
    const res = await fetch(API_URLS.FEAR_GREED, {
      signal: AbortSignal.timeout(TIMEOUT_MEDIUM),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: Array<{ value: string; value_classification: string }> };
    const item = data?.data?.[0];
    if (!item) return null;
    const value = parseInt(item.value, 10);
    if (isNaN(value)) return null;
    return { value, classification: item.value_classification };
  } catch {
    return null;
  }
}

export async function fetchInvestmentReturns(usdRub: number | null): Promise<InvestmentResult> {
  const [sberPrice, btcUsd] = await Promise.all([fetchSberPrice(), fetchBtcUsd()]);

  const sberUnits = INVEST_AMOUNT / SBER_PRICE_2015;
  const usdUnits = INVEST_AMOUNT / USD_RUB_2015;
  const btcRub2015 = BTC_USD_2015 * USD_RUB_2015;
  const btcUnits = INVEST_AMOUNT / btcRub2015;

  const assets: InvestmentAsset[] = [
    {
      name: 'Сбербанк (SBER)',
      emoji: '🏦',
      invested: INVEST_AMOUNT,
      unitsBase: sberUnits,
      currentValueRub: sberPrice !== null ? sberUnits * sberPrice : null,
      error: sberPrice === null,
    },
    {
      name: 'Доллар США (USD)',
      emoji: '💵',
      invested: INVEST_AMOUNT,
      unitsBase: usdUnits,
      currentValueRub: usdRub !== null ? usdUnits * usdRub : null,
      error: usdRub === null,
    },
    {
      name: 'Биткоин (BTC)',
      emoji: '₿',
      invested: INVEST_AMOUNT,
      unitsBase: btcUnits,
      currentValueRub: btcUsd !== null && usdRub !== null ? btcUnits * btcUsd * usdRub : null,
      error: btcUsd === null || usdRub === null,
    },
  ];

  return {
    assets,
    hasErrors: assets.some((a) => a.error),
  };
}

export { FEAR_GREED_LABELS };