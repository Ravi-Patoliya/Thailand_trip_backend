const { randomBytes } = require('crypto');
const { logger } = require('../helpers');

const logger_middleware = (req, res, next) => {
    res.reqId = randomBytes(4).toString('hex');
    res.reqReceiveTime = Date.now();

    // Use Express request properties (method and originalUrl)
    const method = req.method;
    const originalUrl = req.originalUrl || req.url;
    res.originalUrl = originalUrl;
    res.method = method;

    logger.info(`[REQUEST] [ID: ${res.reqId}] [${method}] ${originalUrl}`);
    next();
};

module.exports = logger_middleware;
