const mongoose = require('mongoose');

/**
 * MongoDB connection with:
 * - Retry logic on startup
 * - Graceful shutdown on SIGTERM/SIGINT
 * - Event listeners for connection state logging
 */

let retries = 0;
const MAX_RETRIES = 5;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      // These are the recommended production settings
      maxPoolSize: 10,         // max 10 connections in pool
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
    retries = 0;
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    if (retries < MAX_RETRIES) {
      retries++;
      const delay = retries * 2000; // 2s, 4s, 6s, 8s, 10s
      console.log(`🔄 Retrying in ${delay / 1000}s... (attempt ${retries}/${MAX_RETRIES})`);
      setTimeout(connectDB, delay);
    } else {
      console.error('💀 Max retries reached. Exiting process.');
      process.exit(1);
    }
  }
};

// ── Mongoose event listeners ───────────────────────────────────
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('🔁 MongoDB reconnected');
});

// ── Graceful shutdown ──────────────────────────────────────────
const gracefulShutdown = async (signal) => {
  console.log(`\n${signal} received. Closing MongoDB connection...`);
  await mongoose.connection.close();
  console.log('MongoDB connection closed.');
  process.exit(0);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = connectDB;
