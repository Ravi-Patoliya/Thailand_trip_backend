const logger = require('./logger.helper');
const common = require('./common.helper');
const enums = require('../constants/enums');

// Log response metadata
function responseLogger({ res, message, statusCode }) {
    const { method, originalUrl, reqId, reqReceiveTime } = res || {};
    const responseTime = common.formatTime(Date.now() - reqReceiveTime);
    const log = `[RESPONSE] [ID: ${reqId}] [${method}] ${originalUrl} [STATUS: ${statusCode}] [RESPONSE TIME: '${responseTime}']\n[RESPONSE MESSAGE: '${message}']`;

    const logLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';

    logger[logLevel](log);
}

const API_response = {
    BAD_REQUEST: ({ res, message = '-', payload = {} }) => {
        res.status(enums.HTTP_CODES.BAD_REQUEST).json({
            success: false,
            status: enums.HTTP_CODES.BAD_REQUEST,
            message,
            payload,
        });
    },

    DUPLICATE_VALUE: ({ res, message, payload = {} }) => {
        res.status(enums.HTTP_CODES.DUPLICATE_VALUE).json({
            success: false,
            status: enums.HTTP_CODES.DUPLICATE_VALUE,
            message: message || 'Duplicate value.',
            payload,
        });
    },

    FORBIDDEN: ({ res, message = '-', payload = {} }) => {
        res.status(enums.HTTP_CODES.FORBIDDEN).json({
            success: false,
            status: enums.HTTP_CODES.FORBIDDEN,
            message,
            payload,
        });
    },

    CATCH_ERROR: ({ res, message = '-', payload = {} }) => {
        let responseCode = enums.HTTP_CODES.INTERNAL_SERVER_ERROR;

        if ((message && message.includes('validation failed')) || message.includes('duplicate key error collection')) {
            responseCode = enums.HTTP_CODES.BAD_REQUEST;
        }

        res.status(responseCode).json({
            success: false,
            status: responseCode,
            message,
            payload,
        });
    },

    NOT_ACCEPTABLE: ({ res, message = '-', payload = {} }) => {
        res.status(enums.HTTP_CODES.NOT_ACCEPTABLE).json({
            success: false,
            status: enums.HTTP_CODES.NOT_ACCEPTABLE,
            message,
            payload,
        });
    },

    NOT_FOUND: ({ res, message = '-', payload = {} }) => {
        res.status(enums.HTTP_CODES.NOT_FOUND).json({
            success: false,
            status: enums.HTTP_CODES.NOT_FOUND,
            message,
            payload,
        });
    },

    OK: ({ res, message = '-', payload = {} }) => {
        res.status(enums.HTTP_CODES.OK).json({
            success: true,
            status: enums.HTTP_CODES.OK,
            message,
            payload,
        });
    },
    CREATED: ({ res, message = '-', payload = {} }) => {
        res.status(enums.HTTP_CODES.CREATED).json({
            success: true,
            status: enums.HTTP_CODES.CREATED,
            message,
            payload,
        });
    },

    UNAUTHORIZED: ({ res, message = '-', payload = {} }) => {
        res.status(enums.HTTP_CODES.UNAUTHORIZED).json({
            success: false,
            status: enums.HTTP_CODES.UNAUTHORIZED,
            message,
            payload,
        });
    },

    VALIDATION_ERROR: ({ res, message = '-', payload = {} }) => {
        res.status(enums.HTTP_CODES.VALIDATION_ERROR).json({
            success: false,
            status: enums.HTTP_CODES.VALIDATION_ERROR,
            message,
            payload,
        });
    },

    TOO_MANY_REQUESTS: ({ res, message = '-', payload = {} }) => {
        res.status(enums.HTTP_CODES.TOO_MANY_REQUESTS).json({
            success: false,
            status: enums.HTTP_CODES.TOO_MANY_REQUESTS,
            message,
            payload,
        });
    },

    GONE: ({ res, message = '-', payload = {} }) => {
        res.status(enums.HTTP_CODES.GONE).json({
            success: false,
            status: enums.HTTP_CODES.GONE,
            message,
            payload,
        });
    },

    SERVICE_UNAVAILABLE: ({ res, message = '-', payload = {} }) => {
        res.status(enums.HTTP_CODES.SERVICE_UNAVAILABLE).json({
            success: false,
            status: enums.HTTP_CODES.SERVICE_UNAVAILABLE,
            message,
            payload,
        });
    },
};

// Add logging wrapper to each API response
for (const key in API_response) {
    const originalFn = API_response[key];
    API_response[key] = (args) => {
        const { res, message } = args;
        responseLogger({
            res,
            message,
            statusCode: enums.HTTP_CODES[key],
        });
        originalFn(args);
    };
}

module.exports = API_response;
