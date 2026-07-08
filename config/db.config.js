const mongoose = require('mongoose');
const logger   = require('../helpers/logger.helper');

/**
 * MongoDB connection with:
 * - Retry logic on startup
 * - Graceful shutdown on SIGTERM/SIGINT
 * - Event listeners for connection state logging
 */

const MAX_RETRIES       = 5;
const RETRY_BASE_DELAY_MS = 2000;

const connectDB = async (retries = 0) => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    logger.error(`MongoDB connection error: ${error.message}`);
    if (retries < MAX_RETRIES) {
      const delay = (retries + 1) * RETRY_BASE_DELAY_MS;
      logger.info(`Retrying in ${delay / 1000}s... (attempt ${retries + 1}/${MAX_RETRIES})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return connectDB(retries + 1);
    }
    logger.error('Max retries reached. Exiting process.');
    process.exit(1);
  }
};

// ── Mongoose event listeners ───────────────────────────────────
mongoose.connection.on('disconnected', () => {
  logger.warn('MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  logger.info('MongoDB reconnected');
});

// ── Graceful shutdown ──────────────────────────────────────────
const gracefulShutdown = async (signal) => {
  logger.info(`${signal} received. Closing MongoDB connection...`);
  await mongoose.connection.close();
  logger.info('MongoDB connection closed.');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = connectDB;
