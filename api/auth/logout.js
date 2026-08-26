import { prisma } from '../../server/db.js';
import { hashToken } from '../../server/middleware/auth.js';
import { methodNotAllowed, parseCookies } from '../_shared.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return methodNotAllowed(res);
    }

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
