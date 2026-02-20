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
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        GROQ_API_KEY: process.env.GROQ_API_KEY,
        HF_TOKEN: process.env.HF_TOKEN,
        CHANNEL_ID: process.env.CHANNEL_ID,
        EVENTS_CHANNEL_ID: process.env.EVENTS_CHANNEL_ID,
      }
    }
  ]
};
