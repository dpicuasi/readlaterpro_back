const logger = require('../utils/logger');

const errorHandler = (err, req, res, _next) => {
  const statusCode = err.statusCode || 500;

  if (err.name === 'ValidationError') {
    logger.warn({ message: 'Validation error', errors: Object.values(err.errors).map((e) => e.message), path: req.path });
    return res.status(400).json({
      message: 'Datos inválidos',
      errors: Object.values(err.errors).map((error) => error.message),
    });
  }

  if (err.code === 11000) {
    logger.warn({ message: 'Duplicate key', path: req.path });
    return res.status(409).json({
      message: 'Ya existe un registro con esos datos',
    });
  }

  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    logger.warn({ message: 'Invalid token', path: req.path });
    return res.status(401).json({
      message: 'Token inválido o expirado',
    });
  }

  if (statusCode >= 500) {
    logger.error({ message: err.message, stack: err.stack, path: req.path });
  }

  return res.status(statusCode).json({
    message: err.message || 'Error interno del servidor',
  });
};

module.exports = errorHandler;