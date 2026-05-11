// Establece variables de entorno ANTES de que cualquier módulo sea importado.
// Esto evita que config/env.js lance error por variables faltantes en tests.
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost/readlater-test';
process.env.JWT_SECRET = 'test-secret-for-jest-at-least-32-chars';
process.env.JWT_EXPIRES_IN = '1h';
process.env.OPENROUTER_API_KEY = 'sk-or-xxx-test';
process.env.OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';
process.env.OPENROUTER_MODEL = 'meta-llama/llama-3.3-70b-instruct:free';
process.env.NOTIFICATIONS_ENABLED = 'false';
