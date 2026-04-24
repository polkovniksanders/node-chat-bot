import { TIMEZONE } from '@/config/constants.js';

export const NOSTALGIA_CATEGORIES = [
  'телевидение и реклама',
  'еда и напитки',
  'музыка и концерты',
  'технологии и гаджеты',
  'школа и учёба',
  'двор и игры',
  'мода и стиль',
  'кино и видеосалоны',
  'транспорт и поездки',
  'праздники и традиции',
  'спорт',
  'первые иностранные бренды',
] as const;

export type NostalgiaCategory = (typeof NOSTALGIA_CATEGORIES)[number];

function getDayOfYear(date: Date): number {
  const local = new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const jan1 = new Date(local.getFullYear(), 0, 1);
  const today = new Date(local.getFullYear(), local.getMonth(), local.getDate());
  return Math.round((today.getTime() - jan1.getTime()) / 86_400_000);
}

export function getCategoryForDate(date: Date): NostalgiaCategory {
  const local = new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
  // Year offset shifts the cycle each year so the same date doesn't always get the same category
  const yearOffset = (local.getFullYear() - 2026) * NOSTALGIA_CATEGORIES.length;
  const idx =
    (getDayOfYear(date) + yearOffset + NOSTALGIA_CATEGORIES.length * 1000) %
    NOSTALGIA_CATEGORIES.length;
  return NOSTALGIA_CATEGORIES[idx];
}
