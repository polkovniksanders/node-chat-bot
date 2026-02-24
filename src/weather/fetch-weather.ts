export interface WttrCurrent {
  temp_C: string;
  FeelsLikeC: string;
  weatherCode: string;
  weatherDesc: [{ value: string }];
  windspeedKmph: string;
  winddir16Point: string;
  humidity: string;
  precipMM: string;
  pressure: string;
  visibility: string;
}

export interface WttrDay {
  date: string;
  maxtempC: string;
  mintempC: string;
  hourly: { weatherCode: string; tempC: string }[];
  astronomy: [{ sunrise: string; sunset: string }];
}

export interface WttrResponse {
  current_condition: [WttrCurrent];
  weather: [WttrDay, WttrDay, WttrDay];
  nearest_area: [{ areaName: [{ value: string }] }];
}

export async function fetchWeather(city: string): Promise<WttrResponse> {
  const url = `https://wttr.in/${encodeURIComponent(city)}?format=j1`;
  const res = await fetch(url, {
    headers: { 'User-Agent': 'TelegramWeatherBot/1.0' },
  });

  if (!res.ok) throw new Error(`wttr.in error: ${res.status}`);

  return res.json() as Promise<WttrResponse>;
}
