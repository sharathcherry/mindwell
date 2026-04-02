import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'node:url';
import { chatWithAI, generateTherapyReport, generateLifestyleReport } from './services/nvidia.js';

dotenv.config();

const PORT = process.env.PORT || 3001;
const DEFAULT_CLIENT_ORIGINS = ['http://localhost:5173', 'http://localhost:3000'];

function parseAllowedOrigins(value) {
    if (!value) {
        return DEFAULT_CLIENT_ORIGINS;
    }

    return value
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
}

function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

function normalizeArray(value, maxItems = 50) {
    if (!Array.isArray(value)) {
        return [];
    }

    return value.slice(-maxItems);
}

const allowedOrigins = parseAllowedOrigins(process.env.CLIENT_ORIGINS);

export function createApp() {
    const app = express();

    // Middleware
    app.disable('x-powered-by');
    app.use(cors({
        origin(origin, callback) {
            if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
                callback(null, true);
                return;
            }

            callback(new Error(`Origin ${origin} is not allowed by CORS`));
        },
        credentials: true,
    }));
    app.use(express.json({ limit: '1mb' }));
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
        next();
    });

    // Health check
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            message: 'MindWell API is running',
            version: '1.0.0',
        });
    });

    // Chat endpoint
    app.post('/api/chat', async (req, res) => {
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
            res.json(response);
        } catch (error) {
            console.error('Chat error:', error);
            res.status(500).json({
                error: 'Failed to process message'
            });
        }
    });

    // Therapy report endpoint
    app.post('/api/reports/therapy', async (req, res) => {
        try {
            const { userContext, conversationHistory, moods } = req.body || {};
            const report = await generateTherapyReport(
                isPlainObject(userContext) ? userContext : {},
                normalizeArray(conversationHistory, 50),
                normalizeArray(moods, 50)
            );
            res.json(report);
        } catch (error) {
            console.error('Therapy report error:', error);
            res.status(500).json({ error: 'Failed to generate therapy report' });
        }
    });

    // Lifestyle report endpoint
    app.post('/api/reports/lifestyle', async (req, res) => {
        try {
            const { userContext, moods, journals } = req.body || {};
            const report = await generateLifestyleReport(
                isPlainObject(userContext) ? userContext : {},
                normalizeArray(moods, 50),
                normalizeArray(journals, 50)
            );
            res.json(report);
        } catch (error) {
            console.error('Lifestyle report error:', error);
            res.status(500).json({ error: 'Failed to generate lifestyle report' });
        }
    });

    return app;
}

export function startServer(port = PORT) {
    const app = createApp();
    const server = app.listen(port, () => {
        const address = server.address();
        const actualPort = typeof address === 'object' && address ? address.port : port;
        console.log(`🧠 MindWell API running on http://localhost:${actualPort}`);
        console.log(`   Health check: http://localhost:${actualPort}/api/health`);

        if (!process.env.GROQ_API_KEY && !process.env.NVIDIA_API_KEY) {
            console.warn('⚠️  Warning: No AI API key set (GROQ or NVIDIA). AI features will use fallback responses.');
        } else {
            console.log(`✅ AI Features enabled using ${process.env.GROQ_API_KEY ? 'Groq' : 'NVIDIA'}`);
        }
    });
    return server;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
    startServer();
}
