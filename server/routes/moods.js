import express from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { moodLogSchema } from '../schemas/index.js';

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/moods
 * Fetch authenticated user's mood logs.
 */
router.get('/', async (req, res) => {
    try {
        const { limit, startDate, endDate } = req.query || {};

        const where = {
            userId: req.user.userId,
        };

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
        console.error('Fetch moods error:', error);
        return res.status(500).json({ error: 'Failed to fetch mood logs' });
    }
});

/**
 * POST /api/moods
 * Log a new mood entry with schema validation.
 */
router.post('/', validateBody(moodLogSchema), async (req, res) => {
    try {
        const body = req.validatedBody || req.body || {};
        const { mood, emoji, tags, notes, note, label, timestamp } = body;

        const numericMood = Number(mood);
        if (!Number.isInteger(numericMood) || numericMood < 1 || numericMood > 5) {
            return res.status(400).json({ error: 'Mood must be an integer between 1 and 5' });
        }

        const formattedTags = Array.isArray(tags) ? tags.join(', ') : (tags || label || null);
        const finalNotes = notes || note || null;

        const moodLog = await prisma.moodLog.create({
            data: {
                userId: req.user.userId,
                mood: numericMood,
                emoji: typeof emoji === 'string' ? emoji : null,
                tags: typeof formattedTags === 'string' ? formattedTags : null,
                notes: typeof finalNotes === 'string' ? finalNotes : null,
                timestamp: timestamp ? new Date(timestamp) : new Date(),
            },
        });

        return res.status(201).json({
            mood: moodLog,
            moodLog,
        });
    } catch (error) {
        console.error('Create mood error:', error);
        return res.status(500).json({ error: 'Failed to log mood' });
    }
});

/**
 * DELETE /api/moods/:id
 * Delete a specific mood log.
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.moodLog.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== req.user.userId) {
            return res.status(404).json({ error: 'Mood log not found' });
        }

        await prisma.moodLog.delete({
            where: { id },
        });

        return res.json({
            message: 'Mood log deleted successfully',
            id,
        });
    } catch (error) {
        console.error('Delete mood error:', error);
        return res.status(500).json({ error: 'Failed to delete mood log' });
    }
});

export default router;
