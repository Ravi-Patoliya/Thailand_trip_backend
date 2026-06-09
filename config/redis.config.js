const Redis = require('ioredis');
const logger = require('../helpers/logger.helper');

// Prefer a full REDIS_URL (e.g. redis://:password@host:port/0). Fallback to host/port/env.
const REDIS_URL = process.env.REDIS_URL || null;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || null;

let redis;

if (REDIS_URL) {
  redis = new Redis(REDIS_URL, {
    lazyConnect: false,
    reconnectOnError: (err) => {
      logger.error(`Redis reconnectOnError: ${err?.message || err}`);
      return true;
    }
  });
  
} else {
  redis = new Redis({
    host: REDIS_HOST,
    port: Number(REDIS_PORT),
    password: REDIS_PASSWORD || undefined,
    lazyConnect: false,
    reconnectOnError: (err) => {
      logger.error(`Redis reconnectOnError: ${err?.message || err}`);
      return true;
    }
  });
}

redis.on('connect', () => logger.info('✅ Redis client connected ♦'));
redis.on('error', (err) => logger.error(`❌ Redis error ♦: ${err}`));
redis.on('close', () => logger.warn('🔄 Redis connection closed ♦'));

module.exports = redis;
