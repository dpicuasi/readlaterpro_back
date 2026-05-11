const mongoose = require('mongoose');
const logger = require('../utils/logger');

const env = require('./env');

const MAX_RETRIES = 5;

const connectDB = async (attempt = 1) => {
  try {
    const conn = await mongoose.connect(env.mongoUri, {
      serverSelectionTimeoutMS: 10000,
      connectTimeoutMS: 10000,
    });
    logger.info(`MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Error conectando a MongoDB (intento ${attempt}/${MAX_RETRIES}): ${error.message}`);
    if (attempt >= MAX_RETRIES) {
      logger.error('No se pudo conectar a MongoDB tras varios intentos. El servidor sigue activo.');
      return;
    }
    const delay = Math.min(5000 * attempt, 30000);
    logger.error(`Reintentando en ${delay / 1000} segundos...`);
    await new Promise((resolve) => setTimeout(resolve, delay));
    return connectDB(attempt + 1);
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB desconectado');
});

module.exports = connectDB;
