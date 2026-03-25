export const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages';
export const ANTHROPIC_MODEL = 'claude-haiku-4-5-20251001';

export const TIMEOUT_SHORT = 5000;
export const TIMEOUT_MEDIUM = 6000;
export const TIMEOUT_LONG = 8000;

export const API_URLS = {
  OPEN_HOLIDAYS: 'https://openholidaysapi.org/PublicHolidays',
  IS_DAY_OFF: 'https://isdayoff.ru/api/getdata',
  CALEND_RU: 'https://www.calend.ru/day',
  KAKOY_PRAZDNIK: 'https://kakoysegodnyaprazdnik.ru/baza',
  GEONAMES_CITIES: 'http://api.geonames.org/citiesJSON',
  OPENWEATHERMAP: 'https://api.openweathermap.org/data/2.5/weather',
  OPEN_METEO: 'https://api.open-meteo.com/v1/forecast',
  CAT_FACT: 'https://catfact.ninja/fact',
  DOG_FACT: 'https://dogapi.dog/api/v2/facts',
  DICTIONARY: 'https://api.dictionaryapi.dev/api/v2/entries/en',
  USELESS_FACTS: 'https://uselessfacts.jsph.pl/api/v2/facts/random',
  CBR_RATES: 'https://www.cbr-xml-daily.ru/daily_json.js',
  EXCHANGE_RATES: 'https://open.er-api.com/v6/latest/USD',
  SUNRISE_SUNSET: 'https://api.sunrise-sunset.org/json',
  RIDDLES: 'https://riddles-api.vercel.app/random',
  COFFEE: 'https://coffee.alexflipnote.dev/random.json',
  BYABBE: 'https://byabbe.se/on-this-day',
  MOEX_SBER: 'https://iss.moex.com/iss/engines/stock/markets/shares/boards/TQBR/securities/SBER.json?iss.meta=off&iss.only=marketdata&marketdata.columns=SECID,LAST,PREVLEGALCLOSEPRICE',
  COINGECKO_BTC: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=usd',
  FEAR_GREED: 'https://api.alternative.me/fng/?limit=1',
} as const;