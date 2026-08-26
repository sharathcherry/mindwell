import jwt from 'jsonwebtoken';
import crypto from 'node:crypto';

export const JWT_SECRET = process.env.JWT_SECRET || 'mindwell-super-secret-jwt-key-2026';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'mindwell-super-secret-refresh-key-2026';
export const ACCESS_TOKEN_EXPIRES_IN = '15m';
export const REFRESH_TOKEN_EXPIRES_IN = '7d';
export const REFRESH_TOKEN_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Deterministically hash tokens before storing in database for security.
 */
export function hashToken(token) {
    if (!token || typeof token !== 'string') return '';
    return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Generate short-lived JWT access token (15m).
 */
export function generateAccessToken(user) {
    const payload = {
        userId: user.id || user.userId,
        email: user.email,
        name: user.name || null,
        role: user.role || 'user',
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

/**
 * Generate long-lived JWT refresh token (7d).
 */
export function generateRefreshToken(user) {
    const payload = {
        userId: user.id || user.userId,
        tokenType: 'refresh',
        timestamp: Date.now(),
    };
    return jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

/**
 * Verify JWT access token.
 */
export function verifyAccessToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

/**
 * Verify JWT refresh token.
 */
export function verifyRefreshToken(token) {
    return jwt.verify(token, JWT_REFRESH_SECRET);
}

/**
 * Express middleware to guard private endpoints.
 * Requires valid Bearer JWT in Authorization header (or accessToken cookie fallback).
 */
export function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || req.headers.Authorization;

    if (!authHeader) {
        // Fallback to accessToken cookie if present
        if (req.cookies?.accessToken) {
            try {
                const decoded = verifyAccessToken(req.cookies.accessToken);
                req.user = decoded;
                req.userId = decoded.userId;
                return next();
            } catch (err) {
                if (err.name === 'TokenExpiredError') {
                    return res.status(401).json({ error: 'Token has expired' });
                }
                return res.status(401).json({ error: 'Invalid or forged token signature' });
            }
        }
        return res.status(401).json({ error: 'Authorization header required' });
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
        return res.status(401).json({ error: 'Invalid token format. Expected Bearer <token>' });
    }

    const token = parts[1];
    if (!token || token.trim() === '') {
        return res.status(401).json({ error: 'Authorization token required' });
    }

    try {
        const decoded = verifyAccessToken(token);
        req.user = decoded;
        req.userId = decoded.userId;
        return next();
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token has expired' });
        }
        return res.status(401).json({ error: 'Invalid or forged token signature' });
    }
}

/**
 * Optional auth middleware: sets req.user if valid token provided, but doesn't block.
 */
export function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const token = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.cookies?.accessToken;

    if (token) {
        try {
            const decoded = verifyAccessToken(token);
            req.user = decoded;
            req.userId = decoded.userId;
        } catch {
            // Silently ignore invalid optional token
        }
    }
    return next();
}
