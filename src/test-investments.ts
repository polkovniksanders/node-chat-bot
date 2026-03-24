/**
 * Тест блока "Машина времени инвестора".
 * Запуск: npm run test-investments
 */

import 'dotenv/config';

const INVEST_AMOUNT = 1000;
const SBER_PRICE_2015 = 65.0;
const USD_RUB_2015 = 56.24;
const BTC_USD_2015 = 320.0;

// ─── MOEX: текущая цена SBER ─────────────────────────────────────────────────
async function fetchSberPrice(): Promise<number | null> {
  const url =
    'https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities/SBER.json';
  console.log('📡 MOEX ISS →', url);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    console.log('   HTTP', res.status);
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const cols: string[] = data?.marketdata?.columns ?? [];
    const rows: any[][] = data?.marketdata?.data ?? [];
    const lastIdx = cols.indexOf('LAST');
    console.log('   LAST idx:', lastIdx, '| row[0][LAST]:', rows[0]?.[lastIdx]);
    if (lastIdx === -1 || !rows[0]) return null;
    const price = rows[0][lastIdx];
    return typeof price === 'number' && price > 0 ? price : null;
  } catch (e) {
    console.log('   ERROR:', e);
    return null;
  }
}

// ─── CoinGecko: текущая цена BTC/USD ─────────────────────────────────────────
async function fetchBtcUsd(): Promise<number | null> {
  const url = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd';
  console.log('📡 CoinGecko →', url);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    console.log('   HTTP', res.status);
    if (!res.ok) return null;
    const data = (await res.json()) as { bitcoin?: { usd?: number } };
    console.log('   BTC/USD:', data?.bitcoin?.usd);
    return data?.bitcoin?.usd ?? null;
  } catch (e) {
    console.log('   ERROR:', e);
    return null;
  }
}

// ─── ЦБ РФ: текущий USD/RUB ──────────────────────────────────────────────────
async function fetchUsdRub(): Promise<number | null> {
  const url = 'https://www.cbr-xml-daily.ru/daily_json.js';
  console.log('📡 CBR →', url);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    console.log('   HTTP', res.status);
    if (!res.ok) return null;
    const data = (await res.json()) as {
      Valute: Record<string, { Nominal: number; Value: number }>;
    };
    const usd = data.Valute['USD'];
    const rate = usd ? usd.Value / usd.Nominal : null;
    console.log('   USD/RUB:', rate);
    return rate;
  } catch (e) {
    console.log('   ERROR:', e);
    return null;
  }
}

// ─── Fear & Greed Index ───────────────────────────────────────────────────────
const FEAR_GREED_LABELS: Record<string, string> = {
  'Extreme Fear':  'Экстремальный страх 😱',
  'Fear':          'Страх 😨',
  'Neutral':       'Нейтрально 😐',
  'Greed':         'Жадность 🤑',
  'Extreme Greed': 'Экстремальная жадность 🚀',
};

async function fetchFearGreed(): Promise<{ value: number; classification: string } | null> {
  const url = 'https://api.alternative.me/fng/?limit=1';
  console.log('📡 Fear & Greed →', url);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(6000) });
    console.log('   HTTP', res.status);
    if (!res.ok) return null;
    const data = (await res.json()) as { data?: Array<{ value: string; value_classification: string }> };
    const item = data?.data?.[0];
    if (!item) return null;
    const value = parseInt(item.value, 10);
    console.log('   value:', value, '| classification:', item.value_classification);
    return { value, classification: item.value_classification };
  } catch (e) {
    console.log('   ERROR:', e);
    return null;
  }
}

// ─── Расчёт и вывод ───────────────────────────────────────────────────────────
function calcAsset(
  name: string,
  emoji: string,
  unitsBase: number,
  currentPriceRub: number | null,
): void {
  if (currentPriceRub === null) {
    console.log(`${emoji} ${name}: ❌ нет данных`);
    return;
  }
  const current = unitsBase * currentPriceRub;
  const profit = current - INVEST_AMOUNT;
  const pct = ((profit / INVEST_AMOUNT) * 100).toFixed(1);
  const sign = profit >= 0 ? '+' : '';
  const arrow = profit >= 0 ? '📈' : '📉';
  console.log(
    `${emoji} ${name}: ${current.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽  ${arrow}  ${sign}${profit.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽ (${sign}${pct}%)`,
  );
}

async function main() {
  console.log('=== Тест: Машина времени инвестора ===\n');

  const [sberPrice, btcUsd, usdRub, fearGreed] = await Promise.all([
    fetchSberPrice(),
    fetchBtcUsd(),
    fetchUsdRub(),
    fetchFearGreed(),
  ]);

  console.log('\n=== Результаты ===\n');
  console.log(`Историческая база (01.01.2015):`);
  console.log(`  SBER: ${SBER_PRICE_2015} ₽/акция → куплено ${(INVEST_AMOUNT / SBER_PRICE_2015).toFixed(4)} акций`);
  console.log(`  USD:  ${USD_RUB_2015} ₽/$     → куплено ${(INVEST_AMOUNT / USD_RUB_2015).toFixed(4)} USD`);
  console.log(`  BTC:  $${BTC_USD_2015} × ${USD_RUB_2015} = ${(BTC_USD_2015 * USD_RUB_2015).toFixed(0)} ₽/BTC → куплено ${(INVEST_AMOUNT / (BTC_USD_2015 * USD_RUB_2015)).toFixed(8)} BTC`);
  console.log();

  const sberPriceRub = sberPrice;
  const usdPriceRub = usdRub;
  const btcPriceRub = btcUsd !== null && usdRub !== null ? btcUsd * usdRub : null;

  calcAsset('Сбербанк (SBER)', '🏦', INVEST_AMOUNT / SBER_PRICE_2015, sberPriceRub);
  calcAsset('Доллар США (USD)', '💵', INVEST_AMOUNT / USD_RUB_2015, usdPriceRub);
  calcAsset('Биткоин (BTC)', '₿', INVEST_AMOUNT / (BTC_USD_2015 * USD_RUB_2015), btcPriceRub);

  console.log();
  if (fearGreed) {
    const label = FEAR_GREED_LABELS[fearGreed.classification] ?? fearGreed.classification;
    console.log(`😱🤑 Индекс страха и жадности: ${fearGreed.value}/100 — ${label}`);
  } else {
    console.log('😱🤑 Индекс страха и жадности: ❌ нет данных');
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('Fatal:', err);
  process.exit(1);
});