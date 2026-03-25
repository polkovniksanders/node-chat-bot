/**
 * Тест блока "Машина времени инвестора".
 * Запуск: npm run test-investments
 */

import 'dotenv/config';
import {
  INVEST_AMOUNT,
  SBER_PRICE_2015,
  USD_RUB_2015,
  BTC_USD_2015,
  FEAR_GREED_LABELS,
} from '../src/config/constants.js';
import { fetchInvestmentReturns, fetchFearGreedIndex } from '../src/events/fetchers/investments.js';
import { fetchCbrRates } from '../src/events/fetchers/misc.js';

async function main() {
  console.log('=== Тест: Машина времени инвестора ===\n');

  const cbrRates = await fetchCbrRates();
  const usdRub = cbrRates.find((r) => r.code === 'USD')?.valueRub ?? null;

  console.log(`📡 USD/RUB: ${usdRub ?? 'недоступно'}`);

  const [investmentResult, fearGreed] = await Promise.all([
    fetchInvestmentReturns(usdRub),
    fetchFearGreedIndex(),
  ]);

  console.log('\n=== Результаты ===\n');
  console.log(`Историческая база (01.01.2015):`);
  console.log(`  SBER: ${SBER_PRICE_2015} ₽/акция → куплено ${(INVEST_AMOUNT / SBER_PRICE_2015).toFixed(4)} акций`);
  console.log(`  USD:  ${USD_RUB_2015} ₽/$     → куплено ${(INVEST_AMOUNT / USD_RUB_2015).toFixed(4)} USD`);
  console.log(`  BTC:  $${BTC_USD_2015} × ${USD_RUB_2015} = ${(BTC_USD_2015 * USD_RUB_2015).toFixed(0)} ₽/BTC → куплено ${(INVEST_AMOUNT / (BTC_USD_2015 * USD_RUB_2015)).toFixed(8)} BTC`);
  console.log();

  for (const asset of investmentResult.assets) {
    if (asset.error || asset.currentValueRub === null) {
      console.log(`${asset.emoji} ${asset.name}: ❌ нет данных`);
      continue;
    }
    const profit = asset.currentValueRub - asset.invested;
    const pct = ((profit / asset.invested) * 100).toFixed(1);
    const sign = profit >= 0 ? '+' : '';
    const arrow = profit >= 0 ? '📈' : '📉';
    console.log(
      `${asset.emoji} ${asset.name}: ${asset.currentValueRub.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽  ${arrow}  ${sign}${profit.toLocaleString('ru-RU', { maximumFractionDigits: 0 })} ₽ (${sign}${pct}%)`,
    );
  }

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