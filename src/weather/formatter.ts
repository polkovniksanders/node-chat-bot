import { WeatherData } from '@/weather/fetch-weather.js';

// WMO weather codes → [emoji, описание]
const WMO: Record<number, [string, string]> = {
  0:  ['☀️', 'Ясно'],
  1:  ['🌤', 'Преимущественно ясно'],
  2:  ['⛅', 'Переменная облачность'],
  3:  ['☁️', 'Пасмурно'],
  45: ['🌫', 'Туман'],
  48: ['🌫', 'Ледяной туман'],
  51: ['🌦', 'Слабая морось'],
  53: ['🌦', 'Морось'],
  55: ['🌧', 'Сильная морось'],
  56: ['🌨', 'Лёгкий ледяной дождь'],
  57: ['🌨', 'Ледяной дождь'],
  61: ['🌧', 'Слабый дождь'],
  63: ['🌧', 'Дождь'],
  65: ['🌧', 'Сильный дождь'],
  66: ['🌨', 'Слабый ледяной дождь'],
  67: ['🌨', 'Сильный ледяной дождь'],
  71: ['❄️', 'Слабый снег'],
  73: ['❄️', 'Снег'],
  75: ['❄️', 'Сильный снег'],
  77: ['🌨', 'Снежная крупа'],
  80: ['🌦', 'Ливень'],
  81: ['🌧', 'Сильный ливень'],
  82: ['⛈', 'Проливной дождь'],
  85: ['❄️', 'Снежный ливень'],
  86: ['❄️', 'Сильный снежный ливень'],
  95: ['⛈', 'Гроза'],
  96: ['⛈', 'Гроза с градом'],
  99: ['⛈', 'Гроза с сильным градом'],
};

const WIND_DIRS = ['С','ССВ','СВ','ВСВ','В','ВЮВ','ЮВ','ЮЮВ','Ю','ЮЮЗ','ЮЗ','ЗЮЗ','З','ЗСЗ','СЗ','ССЗ'];
const DAY_NAMES = ['Вс','Пн','Вт','Ср','Чт','Пт','Сб'];
const MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];

function wmo(code: number): [string, string] {
  return WMO[code] ?? ['🌡', 'Переменно'];
}

function windDir(deg: number): string {
  return WIND_DIRS[Math.round(deg / 22.5) % 16];
}

function formatDay(dateStr: string): string {
  const d = new Date(dateStr);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function formatWeather(data: WeatherData): string {
  const c = data.current;
  const [curIcon, curDesc] = wmo(c.weather_code);

  const lines: string[] = [
    `${curIcon} <b>Погода: ${data.location}</b>`,
    '',
    `🌡 <b>${Math.round(c.temperature_2m)}°C</b> (ощущается ${Math.round(c.apparent_temperature)}°C)`,
    `☁️ ${curDesc}`,
    `💨 Ветер: ${Math.round(c.wind_speed_10m)} км/ч ${windDir(c.wind_direction_10m)}`,
    `💧 Влажность: ${c.relative_humidity_2m}%`,
    `📊 Давление: ${Math.round(c.surface_pressure)} гПа`,
  ];

  if (c.precipitation > 0) {
    lines.push(`🌧 Осадки: ${c.precipitation} мм`);
  }

  lines.push('', `📆 <b>Прогноз на 3 дня:</b>`);

  for (let i = 0; i < data.daily.time.length; i++) {
    const [icon] = wmo(data.daily.weather_code[i]);
    const max = Math.round(data.daily.temperature_2m_max[i]);
    const min = Math.round(data.daily.temperature_2m_min[i]);
    lines.push(`• ${formatDay(data.daily.time[i])}: ${icon} ${min}°C…${max}°C`);
  }

  return lines.join('\n');
}
