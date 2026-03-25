import { API_URLS, TIMEOUT_LONG } from '@/config/api.js';
import { FALLBACK_PLACES, WMO_SHORT } from '@/config/constants.js';
import type { PlaceInfo, CompactWeather } from '@/types/index.js';

export async function fetchRandomPlace(): Promise<PlaceInfo> {
  const username = process.env.GEONAMES_USERNAME;
  if (username) {
    try {
      const url = `${API_URLS.GEONAMES_CITIES}?north=90&south=-90&east=180&west=-180&lang=ru&maxRows=500&username=${username}`;
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_LONG) });
      if (res.ok) {
        const data = (await res.json()) as { geonames: any[] };
        const cities = data.geonames;
        if (cities?.length) {
          const city = cities[Math.floor(Math.random() * cities.length)];
          return {
            name: city.name,
            country: city.countryName,
            lat: parseFloat(city.lat),
            lon: parseFloat(city.lng),
            population: city.population,
          };
        }
      }
    } catch {
      // fall through to curated list
    }
  }
  return FALLBACK_PLACES[Math.floor(Math.random() * FALLBACK_PLACES.length)];
}

export async function fetchCompactWeather(
  cityName: string,
  lat: number,
  lon: number,
): Promise<CompactWeather | null> {
  const owmKey = process.env.OPENWEATHERMAP_API_KEY;
  if (owmKey) {
    try {
      const url = `${API_URLS.OPENWEATHERMAP}?lat=${lat}&lon=${lon}&appid=${owmKey}&lang=ru&units=metric`;
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_LONG) });
      if (res.ok) {
        const data = (await res.json()) as any;
        return {
          city: cityName,
          temp: Math.round(data.main.temp),
          description: data.weather?.[0]?.description ?? '',
          humidity: data.main.humidity,
        };
      }
    } catch {
      // fall through to Open-Meteo
    }
  }

  try {
    const params = new URLSearchParams({
      latitude: lat.toString(),
      longitude: lon.toString(),
      current: 'temperature_2m,weather_code,relative_humidity_2m',
      timezone: 'auto',
      forecast_days: '1',
    });
    const res = await fetch(`${API_URLS.OPEN_METEO}?${params}`, {
      signal: AbortSignal.timeout(TIMEOUT_LONG),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as any;
    const code: number = data.current.weather_code;
    return {
      city: cityName,
      temp: Math.round(data.current.temperature_2m),
      description: WMO_SHORT[code] ?? 'переменно',
      humidity: data.current.relative_humidity_2m,
    };
  } catch {
    return null;
  }
}