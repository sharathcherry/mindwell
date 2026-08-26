import express from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    hashToken,
    requireAuth,
    REFRESH_TOKEN_MAX_AGE_MS,
} from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { signupSchema, loginSchema } from '../schemas/index.js';

const router = express.Router();

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeUser(user) {
    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        timezone: user.timezone,
        locale: user.locale,
        createdAt: user.createdAt,
    };
}

function setRefreshTokenCookie(res, token) {
    res.cookie('refreshToken', token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: REFRESH_TOKEN_MAX_AGE_MS,
    });
}

/**
 * POST /api/auth/signup
 */
router.post('/signup', validateBody(signupSchema), async (req, res) => {
    try {
        const body = req.validatedBody || req.body || {};
        const { email, password, name, timezone, locale } = body;

        if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
            return res.status(400).json({ error: 'Valid email is required' });
        }

        if (!password || typeof password !== 'string' || password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const existingUser = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (existingUser) {
            return res.status(400).json({ error: 'An account with this email already exists' });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        const user = await prisma.user.create({
            data: {
                email: normalizedEmail,
                passwordHash,
                name: typeof name === 'string' && name.trim() ? name.trim() : null,
                timezone: typeof timezone === 'string' ? timezone.trim() : null,
                locale: typeof locale === 'string' ? locale.trim() : null,
            },
        });

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        await prisma.session.create({
            data: {
                userId: user.id,
                tokenHash: hashToken(refreshToken),
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
            },
        });

        setRefreshTokenCookie(res, refreshToken);

        return res.status(201).json({
            user: sanitizeUser(user),
            accessToken,
        });
    } catch (error) {
        console.error('Signup error:', error);
        return res.status(500).json({ error: 'Failed to create account' });
    }
});

/**
 * POST /api/auth/login
 */
router.post('/login', validateBody(loginSchema), async (req, res) => {
    try {
        const body = req.validatedBody || req.body || {};
        const { email, password } = body;

        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        const user = await prisma.user.findUnique({
            where: { email: normalizedEmail },
        });

        if (!user) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const isValidPassword = await bcrypt.compare(password, user.passwordHash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Invalid email or password' });
        }

        const accessToken = generateAccessToken(user);
        const refreshToken = generateRefreshToken(user);

        await prisma.session.create({
            data: {
                userId: user.id,
                tokenHash: hashToken(refreshToken),
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
            },
        });

        setRefreshTokenCookie(res, refreshToken);

        return res.json({
            user: sanitizeUser(user),
            accessToken,
        });
    } catch (error) {
        console.error('Login error:', error);
        return res.status(500).json({ error: 'Failed to authenticate user' });
    }
});

/**
 * POST /api/auth/refresh
 * Validates httpOnly refresh cookie, enforces DB token rotation & replay protection.
 */
router.post('/refresh', async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

        if (!refreshToken || typeof refreshToken !== 'string') {
            return res.status(401).json({ error: 'Refresh token is required' });
        }

        let decoded;
        try {
            decoded = verifyRefreshToken(refreshToken);
        } catch {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }

        const tokenHash = hashToken(refreshToken);

        const session = await prisma.session.findUnique({
            where: { tokenHash },
            include: { user: true },
        });

        if (!session || session.revokedAt || session.expiresAt < new Date() || !session.user) {
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }

        // Replay protection: Revoke previous refresh token
        await prisma.session.update({
            where: { id: session.id },
            data: { revokedAt: new Date() },
        });

        // Issue rotated tokens
        const newAccessToken = generateAccessToken(session.user);
        const newRefreshToken = generateRefreshToken(session.user);

        await prisma.session.create({
            data: {
                userId: session.userId,
                tokenHash: hashToken(newRefreshToken),
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
            },
        });

        setRefreshTokenCookie(res, newRefreshToken);

        return res.json({
            user: sanitizeUser(session.user),
            accessToken: newAccessToken,
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        return res.status(500).json({ error: 'Failed to refresh token' });
    }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken || req.body?.refreshToken;

        if (refreshToken) {
            const tokenHash = hashToken(refreshToken);
            await prisma.session.updateMany({
                where: { tokenHash, revokedAt: null },
                data: { revokedAt: new Date() },
            });
        }

        res.clearCookie('refreshToken', {
            httpOnly: true,
            sameSite: 'lax',
            path: '/',
        });

        return res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Logout error:', error);
        return res.status(500).json({ error: 'Failed to logout' });
    }
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, async (req, res) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.userId },
        });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({
            user: sanitizeUser(user),
        });
    } catch (error) {
        console.error('Get me error:', error);
        return res.status(500).json({ error: 'Failed to get user profile' });
    }
});

export default router;
