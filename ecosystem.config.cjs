module.exports = {
  apps: [
    {
      name: 'chat_bot',
      script: './dist/index.js',
      env: {
        NODE_ENV: 'production',
        TELEGRAM_TOKEN: process.env.TELEGRAM_TOKEN,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        GEMINI_API_KEY: process.env.GEMINI_API_KEY,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        CHANNEL_ID: process.env.CHANNEL_ID
      }
    }
  ]
};
