import { generateLifestyleReport } from '../../server/services/nvidia.js';
import { isPlainObject, methodNotAllowed, normalizeArray } from '../_shared.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return methodNotAllowed(res);
    }

    try {
        const { userContext, moods, journals } = req.body || {};
        const report = await generateLifestyleReport(
            isPlainObject(userContext) ? userContext : {},
            normalizeArray(moods, 50),
            normalizeArray(journals, 50)
        );

        return res.status(200).json(report);
    } catch (error) {
        console.error('Lifestyle report API error:', error);
        return res.status(500).json({ error: 'Failed to generate lifestyle report' });
    }
}

