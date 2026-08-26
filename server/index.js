import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { fileURLToPath } from 'node:url';
import { chatWithAI, generateTherapyReport, generateLifestyleReport, resolveAIConfig } from './services/nvidia.js';
import authRouter from './routes/auth.js';
import moodsRouter from './routes/moods.js';
import journalsRouter from './routes/journals.js';
import conversationsRouter from './routes/conversations.js';
import { optionalAuth } from './middleware/auth.js';
import { validateBody } from './middleware/validate.js';
import { chatSchema, reportSchema } from './schemas/index.js';
import { createRateLimiters } from './middleware/rateLimit.js';

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

export function createApp(options = {}) {
    const app = express();
    const shouldSkipExpressCors = process.env.DISABLE_EXPRESS_CORS === 'true';
    const limiters = options.limiters || createRateLimiters();
    const { authLimiter, chatLimiter, reportLimiter, apiLimiter } = limiters;

    // Core Security & Protective Headers
    app.disable('x-powered-by');
    app.use(helmet({
        frameguard: { action: 'deny' },
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        crossOriginResourcePolicy: { policy: 'same-site' },
        contentSecurityPolicy: false,
        hidePoweredBy: true,
    }));

    if (!shouldSkipExpressCors) {
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
    }
    app.use(cookieParser());
    app.use(express.json({ limit: '1mb' }));

    // Defensive Security Headers Enforcement (guarantees compliance across errors & all routes)
    app.use((req, res, next) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('X-Frame-Options', 'DENY');
        res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
        res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
        next();
    });

    // General API rate limiter across all /api routes
    app.use('/api', apiLimiter);

    // Health check
    app.get('/api/health', (req, res) => {
        res.json({
            status: 'ok',
            message: 'MindWell API is running',
            version: '1.0.0',
        });
    });

    // Mount Auth routes with strict auth rate limiting on signup & login
    app.use('/api/auth/signup', authLimiter);
    app.use('/api/auth/login', authLimiter);
    app.use('/api/auth', authRouter);

    // Mount Resource routes
    app.use('/api/moods', moodsRouter);
    app.use('/api/journals', journalsRouter);
    app.use('/api/conversations', conversationsRouter);

    // Chat endpoint with chatLimiter, auth context integration & schema validation
    app.post('/api/chat', chatLimiter, optionalAuth, validateBody(chatSchema), async (req, res) => {
        try {
            const body = req.validatedBody || req.body || {};
            const { message, conversationHistory, userContext } = body;

            if (!isNonEmptyString(message)) {
                return res.status(400).json({ error: 'Message is required' });
            }

            const mergedUserContext = isPlainObject(userContext) ? { ...userContext } : {};
            if (req.user) {
                mergedUserContext.userId = req.user.userId;
                mergedUserContext.userEmail = req.user.email;
            }

            const response = await chatWithAI(
                message.trim(),
                normalizeArray(conversationHistory, 20),
                mergedUserContext
            );
            res.json(response);
        } catch (error) {
            console.error('Chat error:', error);
            res.status(500).json({
                error: 'Failed to process message'
            });
        }
    });

    // Therapy report endpoint with reportLimiter & schema validation
    app.post('/api/reports/therapy', reportLimiter, optionalAuth, validateBody(reportSchema), async (req, res) => {
        try {
            const body = req.validatedBody || req.body || {};
            const { userContext, conversationHistory, moods } = body;
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

    // Lifestyle report endpoint with reportLimiter & schema validation
    app.post('/api/reports/lifestyle', reportLimiter, optionalAuth, validateBody(reportSchema), async (req, res) => {
        try {
            const body = req.validatedBody || req.body || {};
            const { userContext, moods, journals } = body;
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

export function startServer(port = PORT, options = {}) {
    const app = createApp(options);
    const server = app.listen(port, () => {
        const address = server.address();
        const actualPort = typeof address === 'object' && address ? address.port : port;
        console.log(`🧠 MindWell API running on http://localhost:${actualPort}`);
        console.log(`   Health check: http://localhost:${actualPort}/api/health`);

        const aiConfig = resolveAIConfig();
        if (!aiConfig) {
            console.warn('⚠️  Warning: No AI API key set (GEMINI, GROQ, or NVIDIA). AI features will use fallback responses.');
        } else {
            console.log(`✅ Tier-2 Multimodal AI enabled using ${aiConfig.provider}`);
        }
    });
    return server;
}

const isDirectRun = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isDirectRun) {
    startServer();
}
