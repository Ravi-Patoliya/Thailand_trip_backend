const dotenv = require('dotenv');
const Joi = require('joi');
const logger = require('../helpers/logger.helper');

dotenv.config();
const isTestEnv = process.env.NODE_ENV === 'test';

// Schema validation
const envVarsSchema = Joi.object()
    .keys({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3004),

        SENTRY_DSN: Joi.string().optional().description('Sentry DSN for error tracking'),
        SENTRY_ENVIRONMENT: Joi.string().optional().description('Sentry environment'),
        SENTRY_TRACES_SAMPLE_RATE: Joi.number().default(0.1).description('Sentry traces sample rate'),

        // Firebase — required in production, optional in dev (push notifications skipped when absent)
        FIREBASE_PROJECT_ID: Joi.string().when('NODE_ENV', {
            is:        'production',
            then:      Joi.required(),
            otherwise: Joi.optional(),
        }).description('Firebase project ID'),
        FIREBASE_SERVICE_ACCOUNT_JSON: Joi.string().when('NODE_ENV', {
            is:        'production',
            then:      Joi.required(),
            otherwise: Joi.optional(),
        }).description('Firebase service account JSON string'),
    })
    .unknown();

let envVars = {};

if (!isTestEnv) {
    const { value, error } = envVarsSchema.prefs({ errors: { label: 'key' } }).validate(process.env);
    envVars = value;

    if (error) {
        logger.error(`Config validation error: ${error.message}`);
        throw new Error(`Config validation error: ${error.message}`);
    }
}

const config = {
    environment: envVars.NODE_ENV || process.env.NODE_ENV || 'development',
    port: envVars.NODE_ENV === 'test' ? 3005 : envVars.PORT,
    // jwt.secret is consumed by middlewares/auth.js and helpers/utils.helper.js.
    // This project's primary JWT utils (utils/jwt.js) read JWT_ACCESS_SECRET /
    // JWT_REFRESH_SECRET directly from process.env — these are separate concerns.
    jwt: {
        secret: process.env.JWT_ACCESS_SECRET || 'secret',
        accessExpirationMinutes: process.env.JWT_ACCESS_TTL || '15d',
        refreshExpirationDays: process.env.JWT_REFRESH_TTL || '7d',
        resetPasswordExpirationMinutes: 10,
    },
    sentry: {
        dsn: envVars?.SENTRY_DSN,
        environment: envVars?.SENTRY_ENVIRONMENT || envVars.NODE_ENV || 'development',
        tracesSampleRate: envVars?.SENTRY_TRACES_SAMPLE_RATE || 1.0,
    },
};

module.exports = config;
