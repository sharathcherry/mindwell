import bcrypt from 'bcryptjs';
import { prisma } from '../../server/db.js';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    hashToken,
    REFRESH_TOKEN_MAX_AGE_MS,
} from '../../server/middleware/auth.js';
import { methodNotAllowed, parseCookies, verifyApiAuth } from '../_shared.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
    const action = req.query?.action || (req.url ? req.url.split('?')[0].split('/').filter(Boolean).pop() : '');

    switch (action) {
        case 'signup':
            return handleSignup(req, res);
        case 'login':
            return handleLogin(req, res);
        case 'refresh':
            return handleRefresh(req, res);
        case 'me':
            return handleMe(req, res);
        case 'logout':
            return handleLogout(req, res);
        default:
            return res.status(404).json({ error: `Unknown auth action: ${action}` });
    }
}

async function handleSignup(req, res) {
    if (req.method !== 'POST') return methodNotAllowed(res);

    try {
        const { email, password, name, timezone, locale } = req.body || {};
        if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
            return res.status(400).json({ error: 'Valid email is required' });
        }
        if (!password || typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
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

        const cookieOptions = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(REFRESH_TOKEN_MAX_AGE_MS / 1000)}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
        res.setHeader('Set-Cookie', `refreshToken=${refreshToken}; ${cookieOptions}`);

        return res.status(201).json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                timezone: user.timezone,
                locale: user.locale,
                createdAt: user.createdAt,
            },
            accessToken,
        });
    } catch (error) {
        console.error('API signup error:', error);
        return res.status(500).json({ error: 'Failed to create account' });
    }
}

async function handleLogin(req, res) {
    if (req.method !== 'POST') return methodNotAllowed(res);

    try {
        const { email, password } = req.body || {};
        if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
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

        const cookieOptions = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(REFRESH_TOKEN_MAX_AGE_MS / 1000)}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
        res.setHeader('Set-Cookie', `refreshToken=${refreshToken}; ${cookieOptions}`);

        return res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                timezone: user.timezone,
                locale: user.locale,
                createdAt: user.createdAt,
            },
            accessToken,
        });
    } catch (error) {
        console.error('API login error:', error);
        return res.status(500).json({ error: 'Failed to authenticate user' });
    }
}

async function handleRefresh(req, res) {
    if (req.method !== 'POST') return methodNotAllowed(res);

    try {
        const cookies = parseCookies(req);
        const refreshToken = cookies.refreshToken || req.body?.refreshToken;
        if (!refreshToken || typeof refreshToken !== 'string') {
            return res.status(401).json({ error: 'Refresh token is required' });
        }

        try {
            verifyRefreshToken(refreshToken);
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

        await prisma.session.update({
            where: { id: session.id },
            data: { revokedAt: new Date() },
        });

        const newAccessToken = generateAccessToken(session.user);
        const newRefreshToken = generateRefreshToken(session.user);

        await prisma.session.create({
            data: {
                userId: session.userId,
                tokenHash: hashToken(newRefreshToken),
                expiresAt: new Date(Date.now() + REFRESH_TOKEN_MAX_AGE_MS),
            },
        });

        const cookieOptions = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${Math.floor(REFRESH_TOKEN_MAX_AGE_MS / 1000)}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
        res.setHeader('Set-Cookie', `refreshToken=${newRefreshToken}; ${cookieOptions}`);

        return res.json({
            user: {
                id: session.user.id,
                email: session.user.email,
                name: session.user.name,
                role: session.user.role,
                timezone: session.user.timezone,
                locale: session.user.locale,
                createdAt: session.user.createdAt,
            },
            accessToken: newAccessToken,
        });
    } catch (error) {
        console.error('API token refresh error:', error);
        return res.status(500).json({ error: 'Failed to refresh token' });
    }
}

async function handleMe(req, res) {
    if (req.method !== 'GET') return methodNotAllowed(res);

    const auth = verifyApiAuth(req);
    if (auth.error) {
        return res.status(auth.status || 401).json({ error: auth.error });
    }

    try {
        const user = await prisma.user.findUnique({ where: { id: auth.userId } });
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        return res.json({
            user: {
                id: user.id,
                email: user.email,
                name: user.name,
                role: user.role,
                timezone: user.timezone,
                locale: user.locale,
                createdAt: user.createdAt,
            },
        });
    } catch (error) {
        console.error('API get me error:', error);
        return res.status(500).json({ error: 'Failed to fetch user profile' });
    }
}

async function handleLogout(req, res) {
    if (req.method !== 'POST') return methodNotAllowed(res);

    try {
        const cookies = parseCookies(req);
        const refreshToken = cookies.refreshToken || req.body?.refreshToken;
        if (refreshToken) {
            const tokenHash = hashToken(refreshToken);
            await prisma.session.updateMany({
                where: { tokenHash, revokedAt: null },
                data: { revokedAt: new Date() },
            });
        }

        res.setHeader('Set-Cookie', 'refreshToken=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0');
        return res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('API logout error:', error);
        return res.status(500).json({ error: 'Failed to logout' });
    }
}