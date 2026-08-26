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
            if (id) {
                const conversation = await prisma.conversation.findUnique({
                    where: { id },
                    include: {
                        messages: { orderBy: { createdAt: 'asc' } },
                    },
                });

                if (!conversation || conversation.userId !== auth.userId) {
                    return res.status(404).json({ error: 'Conversation not found' });
                }

                return res.json({ conversation, messages: conversation.messages });
            }

            const conversations = await prisma.conversation.findMany({
                where: { userId: auth.userId },
                include: {
                    messages: { orderBy: { createdAt: 'asc' } },
                },
                orderBy: { updatedAt: 'desc' },
            });

            return res.json({ conversations });
        } catch (error) {
            console.error('API conversations GET error:', error);
            return res.status(500).json({ error: 'Failed to fetch conversations' });
        }
    }

    if (req.method === 'POST') {
        try {
            // Append message to existing conversation if id provided
            if (id) {
                const { role, content, detectedEmotion, emotionConfidence, acousticTelemetry, fusion } = req.body || {};
                if (!content || typeof content !== 'string' || !content.trim()) {
                    return res.status(400).json({ error: 'Message content is required' });
                }

                const conversation = await prisma.conversation.findUnique({ where: { id } });
                if (!conversation || conversation.userId !== auth.userId) {
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

                await prisma.conversation.update({
                    where: { id },
                    data: { updatedAt: new Date() },
                });

                return res.status(201).json({ message: chatMessage });
            }

            // Create new conversation
            const { title, messages } = req.body || {};
            const convTitle = typeof title === 'string' && title.trim() ? title.trim() : 'Wellness Session';

            const conversation = await prisma.conversation.create({
                data: {
                    userId: auth.userId,
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
                include: { messages: true },
            });

            return res.status(201).json({ conversation });
        } catch (error) {
            console.error('API conversations POST error:', error);
            return res.status(500).json({ error: 'Failed to create conversation' });
        }
    }

    if (req.method === 'DELETE') {
        try {
            const targetId = id || req.body?.id;
            if (!targetId) {
                return res.status(400).json({ error: 'Conversation ID is required' });
            }

            const existing = await prisma.conversation.findUnique({ where: { id: targetId } });
            if (!existing || existing.userId !== auth.userId) {
                return res.status(404).json({ error: 'Conversation not found' });
            }

            await prisma.conversation.delete({ where: { id: targetId } });
            return res.json({ message: 'Conversation deleted successfully', id: targetId });
        } catch (error) {
            console.error('API conversations DELETE error:', error);
            return res.status(500).json({ error: 'Failed to delete conversation' });
        }
    }

    return methodNotAllowed(res);
}
