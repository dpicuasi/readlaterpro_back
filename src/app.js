const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const connectDB = require('./config/database');
const env = require('./config/env');
const routes = require('./routes');
const errorHandler = require('./middlewares/errorHandler');
const notFoundHandler = require('./middlewares/notFoundHandler');
const { schedulePriorityReminderJob } = require('./jobs/priorityReminderJob');
const logger = require('./utils/logger');

const app = express();

const ALLOWED_ORIGINS = [
  env.frontendUrl,
  'http://localhost:8081',
  'http://localhost:8082',
  'http://localhost:19000',
  'http://localhost:19001',
  'http://localhost:19006',
];

app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      if (
        env.nodeEnv === 'development' &&
        (ALLOWED_ORIGINS.includes(origin) ||
          /^http:\/\/(localhost|127\.0\.0\.1|192\.168\.)/.test(origin))
      ) {
        return callback(null, true);
      }
      if (ALLOWED_ORIGINS.includes(origin)) return callback(null, true);
      callback(new Error(`CORS bloqueado para origen: ${origin}`));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 200,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

app.use('/api', routes);
app.use(notFoundHandler);
app.use(errorHandler);

const start = () => {
  // Levanta el servidor primero para que el healthcheck de Railway responda de inmediato
  app.listen(env.port, () => {
    logger.info(`ReadLaterPro API escuchando en http://localhost:${env.port}`);
  });

  // Conecta a MongoDB en background — si falla, reintenta pero no bloquea el servidor
  connectDB().then(() => {
    schedulePriorityReminderJob();
  });
};

if (require.main === module) {
  start();
}

module.exports = app;
