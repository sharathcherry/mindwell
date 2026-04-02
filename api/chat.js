import { chatWithAI } from '../server/services/nvidia.js';
import { isPlainObject, isNonEmptyString, methodNotAllowed, normalizeArray } from './_shared.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return methodNotAllowed(res);
    }

    try {
        const { message, conversationHistory, userContext } = req.body || {};
        if (!isNonEmptyString(message)) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const response = await chatWithAI(
            message.trim(),
            normalizeArray(conversationHistory, 20),
            isPlainObject(userContext) ? userContext : {}
        );

        return res.status(200).json(response);
    } catch (error) {
        console.error('Chat API error:', error);
        return res.status(500).json({ error: 'Failed to process message' });
    }
}

