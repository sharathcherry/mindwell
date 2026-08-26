import bcrypt from 'bcryptjs';
import { prisma } from '../../server/db.js';
import {
    generateAccessToken,
    generateRefreshToken,
    hashToken,
    REFRESH_TOKEN_MAX_AGE_MS,
} from '../../server/middleware/auth.js';
import { methodNotAllowed } from '../_shared.js';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return methodNotAllowed(res);
    }

    try {
        const { email, password, name, timezone, locale } = req.body || {};

        if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email.trim())) {
            return res.status(400).json({ error: 'Valid email is required' });
        }

        if (!password || typeof password !== 'string' || password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters' });
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
