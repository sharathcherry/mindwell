import express from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { journalEntrySchema, journalUpdateSchema } from '../schemas/index.js';

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/journals
 * Fetch authenticated user's journal entries with optional text search.
 */
router.get('/', async (req, res) => {
    try {
        const { q } = req.query || {};

        const where = {
            userId: req.user.userId,
        };

        if (typeof q === 'string' && q.trim()) {
            const queryText = q.trim();
            where.OR = [
                { title: { contains: queryText } },
                { content: { contains: queryText } },
                { prompt: { contains: queryText } },
                { moodTag: { contains: queryText } },
            ];
        }

        const journals = await prisma.journalEntry.findMany({
            where,
            orderBy: { createdAt: 'desc' },
        });

        return res.json({ journals });
    } catch (error) {
        console.error('Fetch journals error:', error);
        return res.status(500).json({ error: 'Failed to fetch journal entries' });
    }
});

/**
 * POST /api/journals
 * Create a new journal entry with schema validation.
 */
router.post('/', validateBody(journalEntrySchema), async (req, res) => {
    try {
        const body = req.validatedBody || req.body || {};
        const { title, prompt, content, moodTag } = body;

        if (!title || typeof title !== 'string' || !title.trim()) {
            return res.status(400).json({ error: 'Title is required' });
        }

        if (!content || typeof content !== 'string' || !content.trim()) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const journalEntry = await prisma.journalEntry.create({
            data: {
                userId: req.user.userId,
                title: title.trim(),
                prompt: typeof prompt === 'string' && prompt.trim() ? prompt.trim() : null,
                content: content.trim(),
                moodTag: typeof moodTag === 'string' && moodTag.trim() ? moodTag.trim() : null,
            },
        });

        return res.status(201).json({
            journal: journalEntry,
            journalEntry,
        });
    } catch (error) {
        console.error('Create journal error:', error);
        return res.status(500).json({ error: 'Failed to create journal entry' });
    }
});

/**
 * PUT /api/journals/:id
 * Update an existing journal entry.
 */
router.put('/:id', validateBody(journalUpdateSchema), async (req, res) => {
    try {
        const { id } = req.params;
        const body = req.validatedBody || req.body || {};
        const { title, prompt, content, moodTag } = body;

        const existing = await prisma.journalEntry.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== req.user.userId) {
            return res.status(404).json({ error: 'Journal entry not found' });
        }

        const updateData = {};
        if (typeof title === 'string' && title.trim()) updateData.title = title.trim();
        if (prompt !== undefined) updateData.prompt = typeof prompt === 'string' && prompt.trim() ? prompt.trim() : null;
        if (typeof content === 'string' && content.trim()) updateData.content = content.trim();
        if (moodTag !== undefined) updateData.moodTag = typeof moodTag === 'string' && moodTag.trim() ? moodTag.trim() : null;

        const updated = await prisma.journalEntry.update({
            where: { id },
            data: updateData,
        });

        return res.json({
            journal: updated,
            journalEntry: updated,
        });
    } catch (error) {
        console.error('Update journal error:', error);
        return res.status(500).json({ error: 'Failed to update journal entry' });
    }
});

/**
 * DELETE /api/journals/:id
 * Delete a specific journal entry.
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const existing = await prisma.journalEntry.findUnique({
            where: { id },
        });

        if (!existing || existing.userId !== req.user.userId) {
            return res.status(404).json({ error: 'Journal entry not found' });
        }

        await prisma.journalEntry.delete({
            where: { id },
        });

        return res.json({
            message: 'Journal entry deleted successfully',
            id,
        });
    } catch (error) {
        console.error('Delete journal error:', error);
        return res.status(500).json({ error: 'Failed to delete journal entry' });
    }
});

export default router;
