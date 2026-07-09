'use strict';
const express       = require('express');
const cors          = require('cors');
const helmet        = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser  = require('cookie-parser');
const router        = require('./routes/index');

const errorHandler     = require('./middlewares/error.handler');
const requestLogger    = require('./middlewares/request.logger');
const dbHealthCheck    = require('./middlewares/db.health.middleware');

const app = express();

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
}));

const allowedOrigins = [
  process.env.CLIENT_URL,
  process.env.ADMIN_URL,
  'http://localhost:3000',
  'http://localhost:3001',
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error(`CORS: origin "${origin}" not allowed.`));
  },
  credentials:    true,
  methods:        ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser());
app.use(mongoSanitize());
app.use(requestLogger);
app.use('/api/v1', router);

app.use((req, _res, next) => {
  req.redis = app.locals.redis;
  next();
});


app.use(dbHealthCheck);

const { initFirebase } = require('./config/firebase.config');
initFirebase();


app.use((_req, res) => {
  res.status(404).json({ success: false, status: 404, message: "Oops! Looks like you're lost." });
});

app.use(errorHandler);

module.exports = app;
