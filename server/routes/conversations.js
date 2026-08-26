import express from 'express';
import { prisma } from '../db.js';
import { requireAuth } from '../middleware/auth.js';

const router = express.Router();

router.use(requireAuth);

/**
 * GET /api/conversations
 * Fetch all conversations for the authenticated user.
 */
router.get('/', async (req, res) => {
    try {
        const conversations = await prisma.conversation.findMany({
            where: { userId: req.user.userId },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                },
            },
            orderBy: { updatedAt: 'desc' },
        });

        return res.json({ conversations });
    } catch (error) {
        console.error('Fetch conversations error:', error);
        return res.status(500).json({ error: 'Failed to fetch conversations' });
    }
});

/**
 * GET /api/conversations/:id/messages
 * Fetch all messages for a specific conversation.
 */
router.get('/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;

        const conversation = await prisma.conversation.findUnique({
            where: { id },
            include: {
                messages: {
                    orderBy: { createdAt: 'asc' },
                },
            },
        });

        if (!conversation || conversation.userId !== req.user.userId) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        return res.json({ messages: conversation.messages });
    } catch (error) {
        console.error('Fetch conversation messages error:', error);
        return res.status(500).json({ error: 'Failed to fetch messages' });
    }
});

/**
 * POST /api/conversations
 * Create a new conversation with optional initial messages.
 */
router.post('/', async (req, res) => {
    try {
        const { title, messages } = req.body || {};
        const convTitle = typeof title === 'string' && title.trim() ? title.trim() : 'Wellness Session';

        const conversation = await prisma.conversation.create({
            data: {
                userId: req.user.userId,
                title: convTitle,
                messages: Array.isArray(messages) && messages.length > 0 ? {
                    create: messages.map(m => ({
                        role: m.role || 'user',
                        content: m.content || '',
                        detectedEmotion: m.detectedEmotion || null,
                        emotionConfidence: typeof m.emotionConfidence === 'number' ? m.emotionConfidence : null,
                        acousticTelemetry: m.acousticTelemetry ? (typeof m.acousticTelemetry === 'string' ? m.acousticTelemetry : JSON.stringify(m.acousticTelemetry)) : null,
                        fusion: m.fusion ? (typeof m.fusion === 'string' ? m.fusion : JSON.stringify(m.fusion)) : null,
                    })),
                } : undefined,
            },
            include: {
                messages: true,
            },
        });

        return res.status(201).json({ conversation });
    } catch (error) {
        console.error('Create conversation error:', error);
        return res.status(500).json({ error: 'Failed to create conversation' });
    }
});

/**
 * POST /api/conversations/:id/messages
 * Append a new message to a conversation.
 */
router.post('/:id/messages', async (req, res) => {
    try {
        const { id } = req.params;
        const { role, content, detectedEmotion, emotionConfidence, acousticTelemetry, fusion } = req.body || {};

        if (!content || typeof content !== 'string' || !content.trim()) {
            return res.status(400).json({ error: 'Message content is required' });
        }

        const conversation = await prisma.conversation.findUnique({
            where: { id },
        });

        if (!conversation || conversation.userId !== req.user.userId) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        const chatMessage = await prisma.chatMessage.create({
            data: {
                conversationId: id,
                role: role || 'user',
                content: content.trim(),
                detectedEmotion: detectedEmotion || null,
                emotionConfidence: typeof emotionConfidence === 'number' ? emotionConfidence : null,
                acousticTelemetry: acousticTelemetry ? (typeof acousticTelemetry === 'string' ? acousticTelemetry : JSON.stringify(acousticTelemetry)) : null,
                fusion: fusion ? (typeof fusion === 'string' ? fusion : JSON.stringify(fusion)) : null,
            },
        });

        // Touch conversation updated timestamp
        await prisma.conversation.update({
            where: { id },
            data: { updatedAt: new Date() },
        });

        return res.status(201).json({ message: chatMessage });
    } catch (error) {
        console.error('Add message error:', error);
        return res.status(500).json({ error: 'Failed to add message' });
    }
});

/**
 * DELETE /api/conversations/:id
 * Delete a conversation and all its messages.
 */
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;

        const conversation = await prisma.conversation.findUnique({
            where: { id },
        });

        if (!conversation || conversation.userId !== req.user.userId) {
            return res.status(404).json({ error: 'Conversation not found' });
        }

        await prisma.conversation.delete({
            where: { id },
        });

        return res.json({
            message: 'Conversation deleted successfully',
            id,
        });
    } catch (error) {
        console.error('Delete conversation error:', error);
        return res.status(500).json({ error: 'Failed to delete conversation' });
    }
});

export default router;
