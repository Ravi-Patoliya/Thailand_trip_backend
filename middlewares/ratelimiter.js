/**
 * Rate Limiter Middleware
 * Provides protection against DoS attacks and abuse.
 *
 * WARNING: the in-memory Map store is per-process and resets on every restart.
 * In production with multiple Node instances or PM2 cluster mode this offers
 * no real protection — replace with an ioredis-backed store (e.g. rate-limit-redis
 * wrapping the shared Redis client from config/redis.config.js).
 */

const { logger } = require('../helpers');

const rateLimitStore = new Map();

// Cleanup old entries every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
        if (now - data.windowStart > data.windowMs * 2) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);

/**
 * Create a rate limiter middleware
 * @param {Object} options - Rate limiter options
 * @param {number} options.windowMs - Time window in milliseconds (default: 60000 = 1 minute)
 * @param {number} options.maxRequests - Max requests per window (default: 100)
 * @param {string} options.message - Error message when limit exceeded
 * @param {Function} options.keyGenerator - Function to generate unique key (default: IP-based)
 * @param {boolean} options.skipFailedRequests - Skip counting failed requests
 * @returns {Function} Express middleware
 */
const createRateLimiter = (options = {}) => {
    const {
        windowMs = 60 * 1000,  // 1 minute
        maxRequests = 100,
        message = 'Too many requests, please try again later.',
        keyGenerator = (req) => req.ip || req.connection.remoteAddress || 'unknown',
        skipFailedRequests = false,
        statusCode = 429
    } = options;

    return (req, res, next) => {
        const key = keyGenerator(req);
        const now = Date.now();

        // Get or create rate limit data for this key
        let limitData = rateLimitStore.get(key);
        
        if (!limitData || now - limitData.windowStart > windowMs) {
            // Start new window
            limitData = { windowStart: now, count: 0, windowMs };
            rateLimitStore.set(key, limitData);
        }

        // Increment counter
        limitData.count++;

        // Calculate remaining requests and reset time
        const remaining = Math.max(0, maxRequests - limitData.count);
        const resetTime = Math.ceil((limitData.windowStart + windowMs - now) / 1000);

        // Set rate limit headers
        res.set({
            'X-RateLimit-Limit': maxRequests,
            'X-RateLimit-Remaining': remaining,
            'X-RateLimit-Reset': resetTime
        });

        // Check if limit exceeded
        if (limitData.count > maxRequests) {
            logger.warn(`Rate limit exceeded for key: ${key}`);
            return res.status(statusCode).json({
                success: false,
                status: statusCode,
                message,
                retryAfter: resetTime
            });
        }

        // Continue to next middleware
        next();
    };
};

/**
 * Pre-configured rate limiters for common use cases
 */
const rateLimiters = {
    // Strict limit for authentication endpoints
    auth: createRateLimiter({
        windowMs: 15 * 60 * 1000,  // 15 minutes
        maxRequests: 10,
        message: 'Too many login attempts. Please try again after 15 minutes.'
    }),

    // Standard API limit
    api: createRateLimiter({
        windowMs: 60 * 1000,  // 1 minute
        maxRequests: 100,
        message: 'Too many requests. Please slow down.'
    }),

    // Strict limit for file uploads
    upload: createRateLimiter({
        windowMs: 60 * 1000,  // 1 minute
        maxRequests: 10,
        message: 'Too many file uploads. Please wait a moment.'
    }),

    // OTP sending limit
    otp: createRateLimiter({
        windowMs: 5 * 60 * 1000,  // 5 minutes
        maxRequests: 5,
        message: 'Too many OTP requests. Please try again after 5 minutes.'
    }),

    // Template/file download limit
    download: createRateLimiter({
        windowMs: 60 * 1000,  // 1 minute
        maxRequests: 20,
        message: 'Too many download requests. Please wait.'
    })
};

module.exports = {
    createRateLimiter,
    rateLimiters
};
