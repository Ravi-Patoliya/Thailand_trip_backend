const Redis = require('ioredis');
const logger = require('../helpers/logger.helper');

// Redis is optional infrastructure: if it's unreachable, the server must still
// boot and serve every route that doesn't need it. OTP-dependent routes check
// redis.status themselves (see utils/otp.js) and fail with a clean 503 instead.
const REDIS_URL = process.env.REDIS_URL || null;
const REDIS_HOST = process.env.REDIS_HOST || '127.0.0.1';
const REDIS_PORT = process.env.REDIS_PORT || 6379;
const REDIS_PASSWORD = process.env.REDIS_PASSWORD || null;

const commonOptions = {
  lazyConnect: true,
  retryStrategy: (times) => Math.min(times * 1000, 30_000),
  // Upstash silently closes idle connections; ioredis doesn't always notice
  // until a real command hits the dead socket. With maxRetriesPerRequest set,
  // that command fails fast (MaxRetriesPerRequestError) instead of queuing
  // until the reconnect (driven by retryStrategy above) completes.
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
  reconnectOnError: (err) => {
    logger.error(`Redis reconnectOnError: ${err?.message || err}`);
    return true;
  }
};

const redis = REDIS_URL
  ? new Redis(REDIS_URL, commonOptions)
  : new Redis({
      host: REDIS_HOST,
      port: Number(REDIS_PORT),
      password: REDIS_PASSWORD || undefined,
      ...commonOptions
    });

redis.on('connect', () => logger.info('✅ Redis client connected ♦'));
redis.on('error', (err) => logger.error(`❌ Redis error ♦ (OTP features degraded): ${err?.message || err}`));
redis.on('close', () => logger.warn('🔄 Redis connection closed ♦'));

// lazyConnect defers the actual TCP connection; kick it off but never let a
// failure here crash the process — errors are handled by the 'error' listener above.
redis.connect().catch(() => {});

// Upstash reaps idle connections; a periodic app-level ping keeps the session
// active so the reaper never triggers, instead of discovering the drop only
// when a real OTP request hits the dead socket.
setInterval(() => {
  redis.ping().catch(() => {});
}, 30_000).unref();

module.exports = redis;
