import bcrypt from 'bcryptjs';
import { prisma } from '../../server/db.js';
import {
    generateAccessToken,
    generateRefreshToken,
    hashToken,
    REFRESH_TOKEN_MAX_AGE_MS,
} from '../../server/middleware/auth.js';
import { methodNotAllowed } from '../_shared.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return methodNotAllowed(res);
    }

    try {
        const { email, password } = req.body || {};

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
