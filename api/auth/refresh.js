import { prisma } from '../../server/db.js';
import {
    generateAccessToken,
    generateRefreshToken,
    verifyRefreshToken,
    hashToken,
    REFRESH_TOKEN_MAX_AGE_MS,
} from '../../server/middleware/auth.js';
import { methodNotAllowed, parseCookies } from '../_shared.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return methodNotAllowed(res);
    }

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

        // Replay protection: Revoke previous session
        await prisma.session.update({
            where: { id: session.id },
            data: { revokedAt: new Date() },
        });

        // Issue new rotated tokens
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
