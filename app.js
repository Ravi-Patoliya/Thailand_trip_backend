'use strict';
const express       = require('express');
const cors          = require('cors');
const helmet        = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser  = require('cookie-parser');

const errorHandler  = require('./middlewares/error.handler');

const authRoutes          = require('./routes/auth.routes');
const userRoutes          = require('./routes/user.routes');
const inquiryRoutes       = require('./routes/inquiry.routes');
const reviewRoutes        = require('./routes/review.routes');
const notificationRoutes  = require('./routes/notification.routes');
const categoryRoutes      = require('./routes/category.routes');
const serviceRoutes       = require('./routes/service.routes');
const uploadRoutes        = require('./routes/upload.routes');

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

app.use((req, _res, next) => {
  req.redis = app.locals.redis;
  next();
});

app.get('/health', (_req, res) => {
  res.json({
    status:  'ok',
    service: 'Thailand Tour API',
    env:     process.env.NODE_ENV,
    ts:      new Date().toISOString(),
  });
});

const { initFirebase } = require('./config/firebase.config');
initFirebase();

app.use('/api/auth',          authRoutes);
app.use('/api/users',         userRoutes);
app.use('/api/inquiries',     inquiryRoutes);
app.use('/api/reviews',       reviewRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/categories',   categoryRoutes);
app.use('/api/services',     serviceRoutes);
app.use('/api/upload',       uploadRoutes);

app.use((_req, res) => {
  res.status(404).json({ success: false, status: 404, message: "Oops! Looks like you're lost." });
});

app.use(errorHandler);

module.exports = app;
