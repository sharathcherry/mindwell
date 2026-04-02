import { methodNotAllowed } from '../_shared.js';

function resolveAudioEndpoint() {
    if (process.env.AUDIO_API_PROCESS_URL) {
        return process.env.AUDIO_API_PROCESS_URL;
    }

    if (process.env.AUDIO_API_URL) {
        return `${process.env.AUDIO_API_URL.replace(/\/$/, '')}/api/audio/process`;
    }

    return null;
}

export const config = {
    api: {
        bodyParser: false,
    },
};

export default async function handler(req, res) {
    if (req.method === 'OPTIONS') {
        res.setHeader('Allow', 'POST, OPTIONS');
        return res.status(204).end();
    }

    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return methodNotAllowed(res);
    }

    const endpoint = resolveAudioEndpoint();
    if (!endpoint) {
        return res.status(503).json({
            error: 'Audio service is not configured.',
            detail: 'Set AUDIO_API_URL or AUDIO_API_PROCESS_URL in Vercel project environment variables.',
        });
    }

    try {
        const upstream = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'content-type': req.headers['content-type'] || 'application/octet-stream',
            },
            body: req,
            duplex: 'half',
        });

        const contentType = upstream.headers.get('content-type') || 'application/json; charset=utf-8';
        const payload = await upstream.text();

        res.setHeader('Content-Type', contentType);
        return res.status(upstream.status).send(payload);
    } catch (error) {
        console.error('Audio proxy error:', error);
        return res.status(502).json({
            error: 'Audio service unreachable.',
            detail: 'Failed to connect to the configured audio API.',
        });
    }
}

