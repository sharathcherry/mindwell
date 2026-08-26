import { isPlainObject, methodNotAllowed, normalizeArray } from '../_shared.js';

export default async function handler(req, res) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return methodNotAllowed(res);
    }

    const type = req.query?.type || (req.url ? req.url.split('?')[0].split('/').filter(Boolean).pop() : 'therapy');

    try {
        const { generateTherapyReport, generateLifestyleReport } = await import('../../server/services/nvidia.js');
        const { userContext, conversationHistory, moods, journals } = req.body || {};

        const ctx = isPlainObject(userContext) ? userContext : {};
        const history = normalizeArray(conversationHistory, 50);
        const moodLogs = normalizeArray(moods, 50);
        const journalLogs = normalizeArray(journals, 50);

        if (type === 'lifestyle') {
            const report = await generateLifestyleReport(ctx, moodLogs, journalLogs);
            return res.status(200).json(report);
        } else {
            const report = await generateTherapyReport(ctx, history, moodLogs);
            return res.status(200).json(report);
        }
    } catch (error) {
        console.error('Report API error:', error);
        return res.status(500).json({ error: `Failed to generate ${type} report` });
    }
}