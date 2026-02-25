interface GeoLocation {
  name: string;
  lat: number;
  lon: number;
}

export interface CurrentWeather {
  temperature_2m: number;
  apparent_temperature: number;
  weather_code: number;
  wind_speed_10m: number;
  wind_direction_10m: number;
  relative_humidity_2m: number;
  precipitation: number;
  surface_pressure: number;
}

export interface WeatherData {
  location: string;
  current: CurrentWeather;
  daily: {
    time: string[];
    weather_code: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
  };
}

async function geocode(city: string): Promise<GeoLocation> {
  const url =
    `https://nominatim.openstreetmap.org/search` +
    `?q=${encodeURIComponent(city)}&format=json&limit=1&accept-language=ru`;

  const res = await fetch(url, {
    headers: { 'User-Agent': 'TelegramWeatherBot/1.0' },
  });

  if (!res.ok) throw new Error(`Geocoding error: ${res.status}`);

  const data = (await res.json()) as any[];
  if (!data.length) throw new Error(`Город не найден: ${city}`);

  return {
    name: data[0].display_name.split(',')[0].trim(),
    lat: parseFloat(data[0].lat),
    lon: parseFloat(data[0].lon),
  };
}

export async function fetchWeather(city: string): Promise<WeatherData> {
  const location = await geocode(city);

  const params = new URLSearchParams({
    latitude: location.lat.toString(),
    longitude: location.lon.toString(),
    current: [
      'temperature_2m',
      'apparent_temperature',
      'weather_code',
      'wind_speed_10m',
      'wind_direction_10m',
      'relative_humidity_2m',
      'precipitation',
      'surface_pressure',
    ].join(','),
    daily: 'weather_code,temperature_2m_max,temperature_2m_min',
    timezone: 'auto',
    forecast_days: '3',
    wind_speed_unit: 'kmh',
  });

  const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`);

  const data = (await res.json()) as any;

  return {
    location: location.name,
    current: data.current,
    daily: data.daily,
  };
}
