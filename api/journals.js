import { prisma } from '../server/db.js';
import { methodNotAllowed, verifyApiAuth } from './_shared.js';

export default async function handler(req, res) {
    const auth = verifyApiAuth(req);
    if (auth.error) {
        return res.status(auth.status || 401).json({ error: auth.error });
    }

    const { id, q } = req.query || {};

    if (req.method === 'GET') {
        try {
            const where = { userId: auth.userId };
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
            console.error('API journals GET error:', error);
            return res.status(500).json({ error: 'Failed to fetch journal entries' });
        }
    }

    if (req.method === 'POST') {
        try {
            const { title, prompt, content, moodTag } = req.body || {};

            if (!title || typeof title !== 'string' || !title.trim()) {
                return res.status(400).json({ error: 'Title is required' });
            }
            if (!content || typeof content !== 'string' || !content.trim()) {
                return res.status(400).json({ error: 'Content is required' });
            }

            const journalEntry = await prisma.journalEntry.create({
                data: {
                    userId: auth.userId,
                    title: title.trim(),
                    prompt: typeof prompt === 'string' && prompt.trim() ? prompt.trim() : null,
                    content: content.trim(),
                    moodTag: typeof moodTag === 'string' && moodTag.trim() ? moodTag.trim() : null,
                },
            });

            return res.status(201).json({ journal: journalEntry, journalEntry });
        } catch (error) {
            console.error('API journals POST error:', error);
            return res.status(500).json({ error: 'Failed to create journal entry' });
        }
    }

    if (req.method === 'PUT') {
        try {
            const targetId = id || req.body?.id;
            if (!targetId) {
                return res.status(400).json({ error: 'Journal ID is required' });
            }

            const { title, prompt, content, moodTag } = req.body || {};

            const existing = await prisma.journalEntry.findUnique({ where: { id: targetId } });
            if (!existing || existing.userId !== auth.userId) {
                return res.status(404).json({ error: 'Journal entry not found' });
            }

            const updateData = {};
            if (typeof title === 'string' && title.trim()) updateData.title = title.trim();
            if (prompt !== undefined) updateData.prompt = typeof prompt === 'string' && prompt.trim() ? prompt.trim() : null;
            if (typeof content === 'string' && content.trim()) updateData.content = content.trim();
            if (moodTag !== undefined) updateData.moodTag = typeof moodTag === 'string' && moodTag.trim() ? moodTag.trim() : null;

            const updated = await prisma.journalEntry.update({
                where: { id: targetId },
                data: updateData,
            });

            return res.json({ journal: updated, journalEntry: updated });
        } catch (error) {
            console.error('API journals PUT error:', error);
            return res.status(500).json({ error: 'Failed to update journal entry' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const targetId = id || req.body?.id;
            if (!targetId) {
                return res.status(400).json({ error: 'Journal ID is required' });
            }

            const existing = await prisma.journalEntry.findUnique({ where: { id: targetId } });
            if (!existing || existing.userId !== auth.userId) {
                return res.status(404).json({ error: 'Journal entry not found' });
            }

            await prisma.journalEntry.delete({ where: { id: targetId } });
            return res.json({ message: 'Journal entry deleted successfully', id: targetId });
        } catch (error) {
            console.error('API journals DELETE error:', error);
            return res.status(500).json({ error: 'Failed to delete journal entry' });
        }
    }

    return methodNotAllowed(res);
}
