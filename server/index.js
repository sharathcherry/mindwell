import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { chatWithAI, generateTherapyReport, generateLifestyleReport } from './services/nvidia.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: 'MindWell API is running' });
});

// Chat endpoint
app.post('/api/chat', async (req, res) => {
    try {
        const { message, conversationHistory, userContext } = req.body;

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const response = await chatWithAI(message, conversationHistory, userContext);
        res.json(response);
    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({
            error: 'Failed to process message',
            message: error.message
        });
    }
});

// Therapy report endpoint
app.post('/api/reports/therapy', async (req, res) => {
    try {
        const { userContext, conversationHistory, moods } = req.body;
        const report = await generateTherapyReport(userContext, conversationHistory, moods);
        res.json(report);
    } catch (error) {
        console.error('Therapy report error:', error);
        res.status(500).json({ error: 'Failed to generate therapy report' });
    }
});

// Lifestyle report endpoint
app.post('/api/reports/lifestyle', async (req, res) => {
    try {
        const { userContext, moods, journals } = req.body;
        const report = await generateLifestyleReport(userContext, moods, journals);
        res.json(report);
    } catch (error) {
        console.error('Lifestyle report error:', error);
        res.status(500).json({ error: 'Failed to generate lifestyle report' });
    }
});

app.listen(PORT, () => {
    console.log(`🧠 MindWell API running on http://localhost:${PORT}`);
    console.log(`   Health check: http://localhost:${PORT}/api/health`);

    if (!process.env.NVIDIA_API_KEY) {
        console.warn('⚠️  Warning: NVIDIA_API_KEY not set. AI features will use fallback responses.');
    }
});
