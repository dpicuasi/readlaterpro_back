const mongoose = require('mongoose');
const logger = require('../utils/logger');

const env = require('./env');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.mongoUri);
    logger.info(`MongoDB conectado: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`Error conectando a MongoDB: ${error.message}`);
    logger.error('Reintentando en 5 segundos...');
    await new Promise((resolve) => setTimeout(resolve, 5000));
    return connectDB();
  }
};

mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB desconectado');
});

module.exports = connectDB;
