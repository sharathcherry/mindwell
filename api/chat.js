import { isPlainObject, isNonEmptyString, methodNotAllowed, normalizeArray } from './_shared.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return methodNotAllowed(res);
    }

    try {
        const { streamChatWithAI } = await import('../server/services/nvidia.js');
        const { message, conversationHistory, userContext } = req.body || {};
        if (!isNonEmptyString(message)) {
            return res.status(400).json({ error: 'Message is required' });
        }

        // Set SSE headers — tokens arrive at the client as they're generated
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no'); // disable Vercel edge buffering

        const send = (event, data) => {
            res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
        };

        const metadata = await streamChatWithAI(
            message.trim(),
            normalizeArray(conversationHistory, 20),
            isPlainObject(userContext) ? userContext : {},
            (delta) => send('delta', { delta })
        );

        // Final event carries fusion metadata so client can update context
        send('done', {
            fusion: metadata.fusion,
            provider: metadata.provider,
            insights: metadata.insights || [],
            contextUpdates: metadata.contextUpdates || {},
        });
        res.end();
    } catch (error) {
        console.error('Chat API error:', error);
        if (res.headersSent) {
            try {
                res.write(`event: error\ndata: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`);
                res.end();
            } catch { /* ignore */ }
        } else {
            res.status(500).json({ error: 'Failed to process message' });
        }
    }
}
