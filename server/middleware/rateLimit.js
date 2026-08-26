import rateLimit from 'express-rate-limit';

/**
 * MindWell Enterprise Rate Limiting Middleware
 * Throttles burst traffic and guards auth/AI endpoints against abuse
 */

const baseRateLimitOptions = {
    standardHeaders: true, // draft-6/draft-7 RateLimit-* headers
    legacyHeaders: false,  // Disable X-RateLimit-* headers
    handler: (req, res, _next, options) => {
        res.status(options.statusCode || 429).json({
            error: 'Too many requests, please try again later.',
            message: 'Too many requests, please try again later.',
        });
    },
};

/**
 * Strict authentication limiter (5 requests per 15 minutes per IP)
 */
export const authLimiter = rateLimit({
    ...baseRateLimitOptions,
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: {
        error: 'Too many requests, please try again later.',
        message: 'Too many requests, please try again later.',
    },
});

/**
 * Chat endpoint rate limiter (30 requests per 1 minute per IP)
 */
export const chatLimiter = rateLimit({
    ...baseRateLimitOptions,
    windowMs: 60 * 1000,
    max: 30,
    message: {
        error: 'Too many requests, please try again later.',
        message: 'Too many requests, please try again later.',
    },
});

/**
 * Report generation limiter (10 requests per 1 minute per IP)
 */
export const reportLimiter = rateLimit({
    ...baseRateLimitOptions,
    windowMs: 60 * 1000,
    max: 10,
    message: {
        error: 'Too many requests, please try again later.',
        message: 'Too many requests, please try again later.',
    },
});

/**
 * General API limiter (100 requests per 15 minutes per IP)
 */
export const apiLimiter = rateLimit({
    ...baseRateLimitOptions,
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: {
        error: 'Too many requests, please try again later.',
        message: 'Too many requests, please try again later.',
    },
});

export function createRateLimiters(overrides = {}) {
    return {
        authLimiter: rateLimit({ ...baseRateLimitOptions, windowMs: 15 * 60 * 1000, max: 5, ...overrides.auth }),
        chatLimiter: rateLimit({ ...baseRateLimitOptions, windowMs: 60 * 1000, max: 30, ...overrides.chat }),
        reportLimiter: rateLimit({ ...baseRateLimitOptions, windowMs: 60 * 1000, max: 10, ...overrides.report }),
        apiLimiter: rateLimit({ ...baseRateLimitOptions, windowMs: 15 * 60 * 1000, max: 100, ...overrides.api }),
    };
}
