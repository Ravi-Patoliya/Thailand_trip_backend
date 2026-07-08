const Sentry = require('@sentry/node');
const { MulterError } = require('multer');
const jwt = require('jsonwebtoken');

const { API_response, logger } = require('../helpers');
const AppError = require('../utils/AppError');

const errorHandler = async (err, req, res, next) => {
    Sentry.captureException(err, {
        user: req.user ? { id: req.user.id, email: req.user.email } : undefined,
        tags: { path: req.path, method: req.method },
    });

    logger.warn(`ERROR at PATH: [${req.path}] METHOD: [${req.method}] MESSAGE: [${err.message}]`);

    if (err instanceof SyntaxError && err.message.includes('JSON')) {
        return API_response.BAD_REQUEST({ res, message: 'Invalid JSON syntax' });
    }

    if (err instanceof MulterError) {
        return API_response.BAD_REQUEST({ res, message: err.message });
    }

    if (err instanceof jwt.JsonWebTokenError || err instanceof jwt.TokenExpiredError || err instanceof jwt.NotBeforeError) {
        return API_response.UNAUTHORIZED({ res, message: err.message });
    }

    if (err instanceof AppError && err.isOperational) {
        const STATUS_MAP = {
            400: 'BAD_REQUEST',
            401: 'UNAUTHORIZED',
            403: 'FORBIDDEN',
            404: 'NOT_FOUND',
            409: 'DUPLICATE_VALUE',
            422: 'VALIDATION_ERROR',
            503: 'SERVICE_UNAVAILABLE',
        };
        const method = STATUS_MAP[err.statusCode];
        if (method) return API_response[method]({ res, message: err.message });
    }

    logger.error(`STACK_ERROR: ${err}`);
    return API_response.CATCH_ERROR({ res, message: err.message });
};

module.exports = errorHandler;
