import type { PlaceInfo } from '@/types/index.js'; // used for FALLBACK_PLACES

export const TIMEZONE = 'Asia/Yekaterinburg';

export const TEST_CHANNEL = '@node_js_test';

export const DEFAULT_CITY = 'Челябинск';

export const CHELYABINSK = {
  name: 'Челябинск',
  lat: 55.1644,
  lon: 61.4368,
};

// Curated fallback cities for when GeoNames is unavailable
export const FALLBACK_PLACES: PlaceInfo[] = [
  { name: 'Токио', country: 'Япония', lat: 35.6762, lon: 139.6503, population: 13960000 },
  { name: 'Рим', country: 'Италия', lat: 41.9028, lon: 12.4964, population: 2873000 },
  { name: 'Рейкьявик', country: 'Исландия', lat: 64.1355, lon: -21.8954, population: 130000 },
  { name: 'Маракеш', country: 'Марокко', lat: 31.6295, lon: -7.9811, population: 1070838 },
  { name: 'Прага', country: 'Чехия', lat: 50.0755, lon: 14.4378, population: 1309000 },
  { name: 'Дублин', country: 'Ирландия', lat: 53.3498, lon: -6.2603, population: 1388000 },
  { name: 'Буэнос-Айрес', country: 'Аргентина', lat: -34.6037, lon: -58.3816, population: 2890151 },
  { name: 'Кейптаун', country: 'ЮАР', lat: -33.9249, lon: 18.4241, population: 4618000 },
  { name: 'Осло', country: 'Норвегия', lat: 59.9139, lon: 10.7522, population: 1023100 },
  { name: 'Амстердам', country: 'Нидерланды', lat: 52.3676, lon: 4.9041, population: 921000 },
  { name: 'Бангкок', country: 'Таиланд', lat: 13.7563, lon: 100.5018, population: 10539000 },
  { name: 'Лиссабон', country: 'Португалия', lat: 38.7223, lon: -9.1393, population: 545245 },
  { name: 'Дубай', country: 'ОАЭ', lat: 25.2048, lon: 55.2708, population: 3478000 },
  { name: 'Уэллингтон', country: 'Новая Зеландия', lat: -41.2866, lon: 174.7756, population: 418500 },
  { name: 'Хельсинки', country: 'Финляндия', lat: 60.1699, lon: 24.9384, population: 658864 },
  { name: 'Краков', country: 'Польша', lat: 50.0647, lon: 19.945, population: 779115 },
  { name: 'Сантьяго', country: 'Чили', lat: -33.4489, lon: -70.6693, population: 7039000 },
  { name: 'Аккра', country: 'Гана', lat: 5.6037, lon: -0.187, population: 2513000 },
  { name: 'Монтевидео', country: 'Уругвай', lat: -34.9011, lon: -56.1645, population: 1381000 },
  { name: 'Бали', country: 'Индонезия', lat: -8.3405, lon: 115.092, population: 4225000 },
  { name: 'Барселона', country: 'Испания', lat: 41.3851, lon: 2.1734, population: 1636762 },
  { name: 'Вена', country: 'Австрия', lat: 48.2082, lon: 16.3738, population: 1897491 },
  { name: 'Стамбул', country: 'Турция', lat: 41.0082, lon: 28.9784, population: 15462452 },
  { name: 'Найроби', country: 'Кения', lat: -1.2921, lon: 36.8219, population: 4397073 },
  { name: 'Сингапур', country: 'Сингапур', lat: 1.3521, lon: 103.8198, population: 5686000 },
];

// Beautiful English words for "Word of the Day"
export const INTERESTING_WORDS = [
  'serendipity',
  'ephemeral',
  'mellifluous',
  'petrichor',
  'solitude',
  'wanderlust',
  'luminous',
  'ethereal',
  'cascade',
  'aurora',
  'zenith',
  'tranquil',
  'resilience',
  'serenade',
  'bliss',
  'harmony',
  'euphoria',
  'compassion',
  'gratitude',
  'halcyon',
  'lullaby',
  'renaissance',
  'serenity',
  'radiance',
  'whimsical',
];

// WMO weather codes → compact Russian descriptions
export const WMO_SHORT: Record<number, string> = {
  0: 'ясно ☀️',
  1: 'преимущественно ясно 🌤',
  2: 'переменная облачность ⛅',
  3: 'пасмурно ☁️',
  45: 'туман 🌫',
  48: 'ледяной туман 🌫',
  51: 'слабая морось 🌦',
  53: 'морось 🌦',
  55: 'сильная морось 🌧',
  61: 'небольшой дождь 🌧',
  63: 'дождь 🌧',
  65: 'сильный дождь 🌧',
  71: 'небольшой снег ❄️',
  73: 'снег ❄️',
  75: 'сильный снег ❄️',
  77: 'снежная крупа 🌨',
  80: 'ливень 🌦',
  81: 'сильный ливень 🌧',
  82: 'проливной дождь ⛈',
  85: 'снежный ливень ❄️',
  86: 'сильный снежный ливень ❄️',
  95: 'гроза ⛈',
  96: 'гроза с градом ⛈',
  99: 'гроза с крупным градом ⛈',
};

// Morning greetings for coffee photo post (8:55)
export const MORNING_GREETINGS = [
  '☕ Доброе утро! Твой утренний кофе уже готов\nЧерез 5 минут выйдет дайджест дня — оставайся с нами 📰',
  '🌅 Новый день начинается!\nВот твой кофе — через 5 минут свежий дайджест ☕',
  '☀️ Доброе утро!\nПока заваривается дайджест — держи кофе ☕ Скоро всё самое интересное 📋',
  '🌸 Пусть этот день будет тёплым!\nКофе уже здесь, дайджест — через 5 минут ☕',
  '🍀 Доброе утро! Начни день с маленькой радости ☕\nЧерез несколько минут — всё самое интересное 📰',
  '✨ Утро началось!\nТвоя чашка кофе уже ждёт тебя ☕ А мы уже готовим дайджест дня 📋',
  '🌿 Хорошего утра!\nКофе — это лучшее начало дня ☕ Дайджест совсем скоро 📰',
];

// Month names in transliteration for kakoysegodnyaprazdnik.ru URLs
export const MONTH_TRANSLITS: Record<number, string> = {
  1: 'yanvar',
  2: 'fevral',
  3: 'mart',
  4: 'aprel',
  5: 'may',
  6: 'iyun',
  7: 'iyul',
  8: 'avgust',
  9: 'sentyabr',
  10: 'oktyabr',
  11: 'noyabr',
  12: 'dekabr',
};