'use strict';
require('dotenv').config();

const validateEnv  = require('./env');
const connectDB    = require('./config/db.config');
const redis        = require('./config/redis.config');
const app          = require('./app');
const roleService  = require('./services/role.service');

const PORT = parseInt(process.env.PORT, 10) || 5000;

const bootstrap = async () => {
  try {
    validateEnv();
    await connectDB();
    await roleService.seedDefaults();

    app.locals.redis = redis;

    const server = app.listen(PORT, () => {
      console.log(`\n🚀 Thailand Tour API running`);
      console.log(`   Environment : ${process.env.NODE_ENV}`);
      console.log(`   Port        : ${PORT}`);
      console.log(`   Health      : http://localhost:${PORT}/api/v1/health\n`);
    });

    const shutdown = async (signal) => {
      console.log(`\n${signal} received. Starting graceful shutdown...`);
      server.close(async () => {
        console.log('HTTP server closed.');
        try { await redis.quit(); } catch (_) {}
        process.exit(0);
      });
      setTimeout(() => { process.exit(1); }, 10_000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT',  () => shutdown('SIGINT'));

    process.on('unhandledRejection', (reason) => {
      console.error('💥 Unhandled Promise Rejection:', reason);
      if (process.env.NODE_ENV === 'production') process.exit(1);
    });

  } catch (err) {
    console.error('💀 Failed to start server:', err.message);
    process.exit(1);
  }
};

bootstrap();
