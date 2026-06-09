const winston = require('winston');
const { format, transports, createLogger } = winston;

const levels = {
    error: 0,
    debug: 3,
    silly: 6,
    warn: 1,
    http: 4,
    request: 7,
    info: 2,
    verbose: 5,
    response: 8,
};

const levelRegex = new RegExp(`(${Object.keys(levels).join('|')})`, 'i');

const devLogFormat = format.printf(
    ({ level, message, timestamp, stack, ms }) =>
        `${level.replace(levelRegex, (lvl) => lvl.toUpperCase())} [${timestamp}]: ${stack || message} [${ms}]`,
);

const logger = createLogger({
    levels,
    level: process.env.LOG_LEVEL || 'debug',
    format: format.combine(
        ...(process.env.NODE_ENV === 'development' ? [format.colorize({ all: true })] : []),
        format.timestamp({
            ...(process.env.NODE_ENV === 'development' ? { format: 'DD-MM-YYYY HH:mm:ss:ms Z' } : {}),
        }),
        format.ms(),
        format.errors({ stack: true }),
        process.env.NODE_ENV === 'development' ? devLogFormat : format.json(),
    ),
    defaultMeta: { service: 'user-service' },
    transports: [
        new transports.Console(),
        ...(process.env.NODE_ENV !== 'development'
            ? [new transports.File({ filename: 'logs/error.log', level: 'error' }), new transports.File({ filename: 'logs/combined.log' })]
            : []),
    ],
});

/* Specialized logger for ride grouping errors */
const groupingLogger = createLogger({
    levels,
    level: 'info',
    format: format.combine(
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }),
        format.json(),
    ),
    defaultMeta: { service: 'ride-grouping' },
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize({ all: true }),
                format.printf(({ level, message, timestamp, stack }) =>
                    `${level.toUpperCase()} [${timestamp}] [GROUPING]: ${stack || message}`
                )
            )
        }),
        new transports.File({ 
            filename: 'logs/grouping.log',
            level: 'info'
        }),
        new transports.File({ 
            filename: 'logs/grouping-errors.log',
            level: 'error'
        })
    ],
});

module.exports = logger;
module.exports.groupingLogger = groupingLogger;
