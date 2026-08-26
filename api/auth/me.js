import { prisma } from '../../server/db.js';
import { methodNotAllowed, verifyApiAuth } from '../_shared.js';

export default async function handler(req, res) {
    if (req.method !== 'GET') {
        return methodNotAllowed(res);
    }

    const auth = verifyApiAuth(req);
    if (auth.error) {
        return res.status(auth.status || 401).json({ error: auth.error });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: auth.userId },
        });

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
