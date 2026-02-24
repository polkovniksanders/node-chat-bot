import { fetchWeather } from '../src/weather/fetch-weather.js';
import { formatWeather } from '../src/weather/formatter.js';

const city = process.argv[2] || 'Челябинск';
const data = await fetchWeather(city);
const msg = formatWeather(data, city);
console.log(msg);
