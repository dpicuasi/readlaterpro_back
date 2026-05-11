require('dotenv').config();

const requiredVariables = ['MONGODB_URI', 'JWT_SECRET'];

requiredVariables.forEach((variable) => {
  if (!process.env[variable]) {
    throw new Error(`Variable de entorno requerida: ${variable}`);
  }
});

const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: process.env.MONGODB_URI,
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  },
  openrouter: {
    apiKey: process.env.OPENROUTER_API_KEY,
    baseUrl: process.env.OPENROUTER_BASE_URL,
    model: process.env.OPENROUTER_MODEL,
  },
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:8081',
  notifications: {
    enabled: process.env.NOTIFICATIONS_ENABLED !== 'false',
    priorityCron: process.env.NOTIFICATIONS_PRIORITY_CRON || '0 15 * * *',
    timezone: process.env.NOTIFICATIONS_TZ || 'UTC',
  },
};

module.exports = config;
