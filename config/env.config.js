const dotenv = require('dotenv');
const Joi = require('joi');
const logger = require('../helpers/logger.helper');

dotenv.config();
const isTestEnv = process.env.NODE_ENV === 'test';

// Schema validation
const envVarsSchema = Joi.object()
    .keys({
        PORT: Joi.number().default(3004),

      
        SENTRY_DSN: Joi.string().optional().description('Sentry DSN for error tracking'),
        SENTRY_ENVIRONMENT: Joi.string().optional().description('Sentry environment'),
        SENTRY_TRACES_SAMPLE_RATE: Joi.number().default(0.1).description('Sentry traces sample rate'),
        // BUCKET: Joi.string().required().description("AWS Bucket Name"),
        // REGION: Joi.string().required().description("AWS Bucket Region"),
        // SECRET_KEY: Joi.string().required().description("AWS Bucket Secret key"),
        // ACCESSKEYID: Joi.string().required().description("AWS Bucket Access Key ID"),
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
    db_host: envVars?.DB_HOSTNAME || 'localhost',
    db_port: envVars?.DB_PORT || '5432',
    db_name: envVars?.DB_NAME || 'postgres',
    db_username: envVars?.DB_USERNAME || 'postgres',
    db_password: envVars?.DB_PASSWORD || 'root',
    db_schema: envVars?.DB_SCHEMA || 'public',
    jwt: {
        secret: envVars?.JWT_SECRET_KEY || 'secret',
        accessExpirationMinutes: envVars?.JWT_ACCESS_EXPIRATION_MINUTES || 60,
        refreshExpirationDays: envVars?.JWT_REFRESH_EXPIRATION_DAYS || 30,
        resetPasswordExpirationMinutes: 10,
    },
    sentry: {
        dsn: envVars?.SENTRY_DSN,
        environment: envVars?.SENTRY_ENVIRONMENT || envVars.NODE_ENV || 'development',
        tracesSampleRate: envVars?.SENTRY_TRACES_SAMPLE_RATE || 1.0,
    },
    // s3_bucket: {
    //   bucket: envVars?.BUCKET,
    //   region: envVars?.REGION,
    //   secretKey: envVars?.SECRET_KEY,
    //   accessKeyId: envVars?.ACCESSKEYID,
    // },
};

module.exports = config;
