module.exports = {
  apps: [
    {
      name: 'chat_bot',
      script: './dist/index.js',
      env: {
        NODE_ENV: 'production',
        BOT_TOKEN: process.env.BOT_TOKEN,
        OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
        OPENAI_API_KEY: process.env.OPENAI_API_KEY,
        POLLINATIONS_API_KEY: process.env.POLLINATIONS_API_KEY,
        CHANNEL_ID: process.env.CHANNEL_ID
      }
    }
  ]
};
