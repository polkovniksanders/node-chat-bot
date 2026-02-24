import { WttrResponse } from '@/weather/fetch-weather.js';

const WEATHER_ICONS: Record<string, string> = {
  '113': '☀️', // Sunny / Clear
  '116': '⛅', // Partly cloudy
  '119': '☁️', // Cloudy
  '122': '☁️', // Overcast
  '143': '🌫', // Mist
  '176': '🌦', // Patchy rain nearby
  '179': '🌨', // Patchy snow nearby
  '182': '🌨', // Patchy sleet
  '185': '🌨', // Patchy freezing drizzle
  '200': '⛈', // Thundery outbreaks
  '227': '🌨', // Blowing snow
  '230': '❄️', // Blizzard
  '248': '🌫', // Fog
  '260': '🌫', // Freezing fog
  '263': '🌧', // Light drizzle
  '266': '🌧', // Drizzle
  '281': '🌧', // Freezing drizzle
  '284': '🌧', // Heavy freezing drizzle
  '293': '🌧', // Patchy light rain
  '296': '🌧', // Light rain
  '299': '🌧', // Moderate rain
  '302': '🌧', // Moderate rain
  '305': '🌧', // Heavy rain
  '308': '🌧', // Heavy rain
  '311': '🌨', // Light freezing rain
  '314': '🌨', // Moderate freezing rain
  '317': '🌨', // Light sleet
  '320': '🌨', // Moderate sleet
  '323': '🌨', // Patchy light snow
  '326': '❄️', // Light snow
  '329': '❄️', // Patchy moderate snow
  '332': '❄️', // Moderate snow
  '335': '❄️', // Patchy heavy snow
  '338': '❄️', // Heavy snow
  '350': '🧊', // Ice pellets
  '353': '🌦', // Light rain shower
  '356': '🌧', // Heavy rain shower
  '359': '🌧', // Torrential rain
  '362': '🌨', // Light sleet showers
  '365': '🌨', // Heavy sleet showers
  '368': '❄️', // Light snow showers
  '371': '❄️', // Heavy snow showers
  '386': '⛈', // Rain with thunder
  '389': '⛈', // Heavy rain with thunder
  '392': '⛈', // Snow with thunder
  '395': '⛈', // Heavy snow with thunder
};

const WIND_DIR: Record<string, string> = {
  N: 'С', NNE: 'ССВ', NE: 'СВ', ENE: 'ВСВ',
  E: 'В', ESE: 'ВЮВ', SE: 'ЮВ', SSE: 'ЮЮВ',
  S: 'Ю', SSW: 'ЮЮЗ', SW: 'ЮЗ', WSW: 'ЗЮЗ',
  W: 'З', WNW: 'ЗСЗ', NW: 'СЗ', NNW: 'ССЗ',
};

const WEATHER_DESC: Record<string, string> = {
  '113': 'Ясно', '116': 'Переменная облачность', '119': 'Облачно',
  '122': 'Пасмурно', '143': 'Дымка', '176': 'Лёгкий дождь',
  '179': 'Лёгкий снег', '182': 'Мокрый снег', '185': 'Ледяная морось',
  '200': 'Гроза', '227': 'Метель', '230': 'Сильная метель',
  '248': 'Туман', '260': 'Ледяной туман', '263': 'Лёгкая морось',
  '266': 'Морось', '281': 'Ледяная морось', '284': 'Сильная ледяная морось',
  '293': 'Слабый дождь', '296': 'Лёгкий дождь', '299': 'Умеренный дождь',
  '302': 'Умеренный дождь', '305': 'Сильный дождь', '308': 'Сильный дождь',
  '311': 'Ледяной дождь', '314': 'Сильный ледяной дождь',
  '317': 'Слабый мокрый снег', '320': 'Мокрый снег',
  '323': 'Слабый снег', '326': 'Лёгкий снег', '329': 'Умеренный снег',
  '332': 'Умеренный снег', '335': 'Сильный снег', '338': 'Сильный снег',
  '350': 'Ледяная крупа', '353': 'Ливень', '356': 'Сильный ливень',
  '359': 'Проливной дождь', '362': 'Ливень со снегом', '365': 'Сильный ливень со снегом',
  '368': 'Снежный ливень', '371': 'Сильный снежный ливень',
  '386': 'Гроза с дождём', '389': 'Гроза с сильным дождём',
  '392': 'Гроза со снегом', '395': 'Гроза с сильным снегом',
};

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];

const MONTH_NAMES = [
  'янв', 'фев', 'мар', 'апр', 'май', 'июн',
  'июл', 'авг', 'сен', 'окт', 'ноя', 'дек',
];

function weatherIcon(code: string): string {
  return WEATHER_ICONS[code] ?? '🌡';
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${DAY_NAMES[d.getDay()]} ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

// Pick midday weather code (index 4 = 12:00)
function middayCode(day: WttrResponse['weather'][number]): string {
  return day.hourly[4]?.weatherCode ?? day.hourly[0]?.weatherCode ?? '113';
}

export function formatWeather(data: WttrResponse, city: string): string {
  const cur = data.current_condition[0];
  const today = data.weather[0];
  const icon = weatherIcon(cur.weatherCode);
  const windDir = WIND_DIR[cur.winddir16Point] ?? cur.winddir16Point;

  const header = `${icon} <b>Погода в ${city}</b>`;

  const current = [
    `🌡 <b>${cur.temp_C}°C</b> (ощущается ${cur.FeelsLikeC}°C)`,
    `☁️ ${WEATHER_DESC[cur.weatherCode] ?? cur.weatherDesc[0].value}`,
    `💨 Ветер: ${cur.windspeedKmph} км/ч ${windDir}`,
    `💧 Влажность: ${cur.humidity}%`,
    `📊 Давление: ${cur.pressure} гПа`,
    cur.precipMM !== '0.0' ? `🌧 Осадки: ${cur.precipMM} мм` : null,
    `🌅 ${today.astronomy[0].sunrise} / 🌇 ${today.astronomy[0].sunset}`,
  ]
    .filter(Boolean)
    .join('\n');

  const forecast = data.weather
    .map((day) => {
      const fi = weatherIcon(middayCode(day));
      return `• ${formatDate(day.date)}: ${fi} ${day.mintempC}°C…${day.maxtempC}°C`;
    })
    .join('\n');

  return `${header}\n\n${current}\n\n📆 <b>Прогноз на 3 дня:</b>\n${forecast}`;
}
