import { prisma } from '../server/db.js';
import { methodNotAllowed, verifyApiAuth } from './_shared.js';

export default async function handler(req, res) {
    const auth = verifyApiAuth(req);
    if (auth.error) {
        return res.status(auth.status || 401).json({ error: auth.error });
    }

    const { id } = req.query || {};

    if (req.method === 'GET') {
        try {
            const { limit, startDate, endDate } = req.query || {};
            const where = { userId: auth.userId };

            if (startDate || endDate) {
                where.timestamp = {};
                if (startDate) where.timestamp.gte = new Date(startDate);
                if (endDate) where.timestamp.lte = new Date(endDate);
            }

            const take = limit ? Math.min(Math.max(parseInt(limit, 10) || 30, 1), 200) : undefined;

            const moods = await prisma.moodLog.findMany({
                where,
                orderBy: { timestamp: 'desc' },
                ...(take ? { take } : {}),
            });

            return res.json({ moods });
        } catch (error) {
            console.error('API moods GET error:', error);
            return res.status(500).json({ error: 'Failed to fetch moods' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { mood, emoji, tags, notes, note, label, timestamp } = req.body || {};
            const numericMood = Number(mood);
            if (!Number.isInteger(numericMood) || numericMood < 1 || numericMood > 5) {
                return res.status(400).json({ error: 'Mood must be an integer between 1 and 5' });
            }

            const combinedTags = tags || label || null;
            const finalNotes = notes || note || null;

            const moodLog = await prisma.moodLog.create({
                data: {
                    userId: auth.userId,
                    mood: numericMood,
                    emoji: typeof emoji === 'string' ? emoji : null,
                    tags: typeof combinedTags === 'string' ? combinedTags : null,
                    notes: typeof finalNotes === 'string' ? finalNotes : null,
                    timestamp: timestamp ? new Date(timestamp) : new Date(),
                },
            });

            return res.status(201).json({ mood: moodLog, moodLog });
        } catch (error) {
            console.error('API moods POST error:', error);
            return res.status(500).json({ error: 'Failed to log mood' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            if (!id) {
                return res.status(400).json({ error: 'Mood ID is required' });
            }

            const existing = await prisma.moodLog.findUnique({ where: { id } });
            if (!existing || existing.userId !== auth.userId) {
                return res.status(404).json({ error: 'Mood log not found' });
            }

            await prisma.moodLog.delete({ where: { id } });
            return res.json({ message: 'Mood log deleted successfully', id });
        } catch (error) {
            console.error('API moods DELETE error:', error);
            return res.status(500).json({ error: 'Failed to delete mood log' });
        }
    }

    return methodNotAllowed(res);
}
