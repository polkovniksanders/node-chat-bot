module.exports = {
  apps: [
    {
      name: 'chat_bot',
      script: './dist/index.js',
      env: {
        NODE_ENV: 'production',
        TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
        ADMIN_USER_ID: process.env.ADMIN_USER_ID,
        // Polza.ai — единственный LLM-провайдер
        POLZA_API_URL: process.env.POLZA_API_URL,
        POLZA_API_KEY: process.env.POLZA_API_KEY,
        POLZA_MODEL: process.env.POLZA_MODEL,
        POLZA_SMART_MODEL: process.env.POLZA_SMART_MODEL,
        // Внешние API модулей
        GEONAMES_USERNAME: process.env.GEONAMES_USERNAME,
        OPENWEATHERMAP_API_KEY: process.env.OPENWEATHERMAP_API_KEY,
        TMDB_API_KEY: process.env.TMDB_API_KEY,
        YOUTUBE_API_KEY: process.env.YOUTUBE_API_KEY,
      }
    }
  ]
};
