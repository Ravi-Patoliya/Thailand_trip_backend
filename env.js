'use strict';

const REQUIRED_VARS = [
  'MONGODB_URI',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'AWS_REGION',
  'AWS_S3_BUCKET',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
];

const OPTIONAL_WITH_DEFAULTS = {
  NODE_ENV:          'development',
  PORT:              '5000',
  CLIENT_URL:        'http://localhost:3000',
  ADMIN_URL:         'http://localhost:3001',
  REDIS_URL:         'redis://localhost:6379',
  JWT_ACCESS_TTL:    '15m',
  JWT_REFRESH_TTL:   '7d',
  AWS_CDN_BASE_URL:  '',
};

const validateEnv = () => {
  const missing = REQUIRED_VARS.filter((v) => !process.env[v]);

  if (missing.length > 0 && process.env.NODE_ENV === 'production') {
    console.error('💀 Missing required environment variables:');
    missing.forEach((v) => console.error(`   - ${v}`));
    process.exit(1);
  }

  if (missing.length > 0) {
    console.warn('⚠️  Missing env vars (OK in dev, REQUIRED in prod):');
    missing.forEach((v) => console.warn(`   - ${v}`));
  }

  Object.entries(OPTIONAL_WITH_DEFAULTS).forEach(([key, val]) => {
    if (!process.env[key]) process.env[key] = val;
  });

  console.log(`✅ Environment: ${process.env.NODE_ENV} | Port: ${process.env.PORT}`);
};

module.exports = validateEnv;
