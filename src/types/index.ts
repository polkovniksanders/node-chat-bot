export type ChatMsg = {
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning_details?: unknown;
};

export interface OpenRouterResponse {
  choices: {
    message: {
      role: string;
      content: string | { type: string; text: string }[];
      reasoning_details?: any;
    };
  }[];
}

// ─── Events / fetchRealEvents types ──────────────────────────────────────────

export interface OpenHoliday {
  id: string;
  startDate: string;
  endDate: string;
  name: Array<{ language: string; text: string }>;
}

export interface PlaceInfo {
  name: string;
  country?: string;
  lat: number;
  lon: number;
  population?: number;
}

export interface CompactWeather {
  city: string;
  temp: number;
  description: string;
  humidity: number;
}

export interface WordMeaning {
  word: string;
  wordRu: string;
  meaning: string;
}

export interface CurrencyRate {
  flag: string;
  code: string;
  valueRub: number;
  previousRub: number;
}

export interface CdfRate {
  cdfPerRub: number;
}

export interface SunTimes {
  sunrise: string;
  sunset: string;
  dayLength: string;
}

export interface Riddle {
  question: string;
  answer: string;
}

export interface InvestmentAsset {
  name: string;
  emoji: string;
  invested: number;        // RUB invested in 2015
  unitsBase: number;       // units purchased at 2015 price
  currentValueRub: number | null;
  error: boolean;
}

export interface InvestmentResult {
  assets: InvestmentAsset[];
  hasErrors: boolean;
}

export interface FearGreedIndex {
  value: number;       // 0–100
  classification: string; // e.g. "Fear", "Greed"
}
