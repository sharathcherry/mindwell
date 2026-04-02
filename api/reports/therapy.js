import { generateTherapyReport } from '../../server/services/nvidia.js';
import { isPlainObject, methodNotAllowed, normalizeArray } from '../_shared.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return methodNotAllowed(res);
    }

    try {
        const { userContext, conversationHistory, moods } = req.body || {};
        const report = await generateTherapyReport(
            isPlainObject(userContext) ? userContext : {},
            normalizeArray(conversationHistory, 50),
            normalizeArray(moods, 50)
        );

        return res.status(200).json(report);
    } catch (error) {
        console.error('Therapy report API error:', error);
        return res.status(500).json({ error: 'Failed to generate therapy report' });
    }
}

