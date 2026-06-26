const mongoose = require('mongoose');

/**
 * MongoDB connection with:
 * - Retry logic on startup
 * - Graceful shutdown on SIGTERM/SIGINT
 * - Event listeners for connection state logging
 */

const MAX_RETRIES = 5;

const connectDB = async (retries = 0) => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log(`✅ MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB connection error: ${error.message}`);
    if (retries < MAX_RETRIES) {
      const delay = (retries + 1) * 2000; // 2s, 4s, 6s, 8s, 10s
      console.log(`🔄 Retrying in ${delay / 1000}s... (attempt ${retries + 1}/${MAX_RETRIES})`);
      await new Promise((resolve) => setTimeout(resolve, delay));
      return connectDB(retries + 1);
    }
    console.error('💀 Max retries reached. Exiting process.');
    process.exit(1);
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
