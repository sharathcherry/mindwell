import { verifyAccessToken } from '../server/middleware/auth.js';

export function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

export function normalizeArray(value, maxItems = 50) {
    if (!Array.isArray(value)) return [];
    return value.slice(-maxItems);
}

export function methodNotAllowed(res) {
    res.status(405).json({ error: 'Method not allowed' });
}

export function parseCookies(req) {
    if (req.cookies && typeof req.cookies === 'object') return req.cookies;
    const cookieHeader = req.headers?.cookie;
    if (!cookieHeader || typeof cookieHeader !== 'string') return {};
    return cookieHeader.split(';').reduce((acc, cookie) => {
        const idx = cookie.indexOf('=');
        if (idx > -1) {
            const key = cookie.slice(0, idx).trim();
            const val = cookie.slice(idx + 1).trim();
            acc[key] = decodeURIComponent(val);
        }
        return acc;
    }, {});
}

export function verifyApiAuth(req) {
    const authHeader = req.headers?.authorization || req.headers?.Authorization;
    const cookies = parseCookies(req);
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.slice(7).trim();
    } else if (cookies.accessToken) {
        token = cookies.accessToken;
    }

    if (!token) {
        return { error: 'Authorization header required', status: 401 };
    }

    try {
        const decoded = verifyAccessToken(token);
        return { user: decoded, userId: decoded.userId };
    } catch (err) {
        if (err.name === 'TokenExpiredError') {
            return { error: 'Token has expired', status: 401 };
        }
        return { error: 'Invalid or forged token signature', status: 401 };
    }
}
