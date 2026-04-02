import { getSystemPrompt, getReportPrompt } from './prompts.js';
import { analyzeMessage, extractTherapyInsights, mergeVoiceEmotion } from './analysis.js';
import { buildCrisisResponse } from './crisis.js';
import { getFallbackResponse } from './fallback.js';

const AI_API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

export async function chatWithAI(message, conversationHistory = [], userContext = {}) {
    const analysis = mergeVoiceEmotion(analyzeMessage(message), userContext);

    // Handle crisis situation
    if (analysis.hasCrisisIndicator) {
        return buildCrisisResponse(userContext);
    }

    // If no API key, use fallback response
    const API_KEY = process.env.GROQ_API_KEY || process.env.NVIDIA_API_KEY;
    if (!API_KEY) {
        return getFallbackResponse(message, analysis, userContext);
    }

    try {
        // Build messages for API
        const systemPrompt = getSystemPrompt(userContext);

        const messages = [
            { role: 'system', content: systemPrompt },
        ];

        // Add recent conversation history (last 10 messages)
        const recentHistory = conversationHistory.slice(-10);
        for (const msg of recentHistory) {
            messages.push({
                role: msg.role === 'assistant' ? 'assistant' : 'user',
                content: msg.content,
            });
        }

        // Add current message
        messages.push({ role: 'user', content: message });

        const response = await fetch(AI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: MODEL,
                messages,
                temperature: 0.7,
                max_tokens: 1024,
                top_p: 0.9,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('AI API error:', error);
            return getFallbackResponse(message, analysis, userContext);
        }

        const data = await response.json();
        const aiMessage = data.choices?.[0]?.message?.content || getFallbackResponse(message, analysis, userContext).message;

        // Extract insights from the exchange
        const { insights, contextUpdates } = extractTherapyInsights(message);

        return {
            message: aiMessage,
            insights,
            contextUpdates,
        };
    } catch (error) {
        console.error('Chat API error:', error);
        return getFallbackResponse(message, analysis, userContext);
    }
}

export async function generateTherapyReport(userContext, conversationHistory, moods) {
    const API_KEY = process.env.GROQ_API_KEY || process.env.NVIDIA_API_KEY;
    if (!API_KEY) {
        return getDefaultTherapyReport(userContext, conversationHistory);
    }

    try {
        const prompt = getReportPrompt('therapy', userContext, conversationHistory, moods);

        const response = await fetch(AI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 2048,
            }),
        });

        if (!response.ok) {
            return getDefaultTherapyReport(userContext, conversationHistory);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        // Try to parse JSON from response
        try {
            return JSON.parse(content);
        } catch {
            return getDefaultTherapyReport(userContext, conversationHistory);
        }
    } catch (error) {
        console.error('Therapy report error:', error);
        return getDefaultTherapyReport(userContext, conversationHistory);
    }
}

function getDefaultTherapyReport(userContext, conversationHistory) {
    return {
        summary: `Based on your ${conversationHistory.length} conversations with MindWell, we've analyzed your patterns to provide personalized recommendations.`,
        therapies: [
            {
                name: 'Cognitive Behavioral Therapy (CBT)',
                description: 'CBT helps identify and change negative thought patterns. It\'s highly effective for anxiety, depression, and stress management.',
            },
            {
                name: 'Mindfulness-Based Cognitive Therapy (MBCT)',
                description: 'Combines cognitive therapy with mindfulness meditation. Great for preventing recurring depression and daily stress management.',
            },
            {
                name: 'Acceptance and Commitment Therapy (ACT)',
                description: 'Focuses on accepting difficult thoughts while committing to positive actions aligned with your values.',
            },
        ],
        questions: [
            'What approach do you typically use with clients who have similar concerns?',
            'How do you measure progress in therapy?',
            'What can I expect from our first few sessions?',
            'How do you incorporate mindfulness or relaxation techniques?',
        ],
    };
}

export async function generateLifestyleReport(userContext, moods, journals) {
    const API_KEY = process.env.GROQ_API_KEY || process.env.NVIDIA_API_KEY;
    if (!API_KEY) {
        return getDefaultLifestyleReport(moods);
    }

    try {
        const prompt = getReportPrompt('lifestyle', userContext, null, moods, journals);

        const response = await fetch(AI_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`,
            },
            body: JSON.stringify({
                model: MODEL,
                messages: [{ role: 'user', content: prompt }],
                temperature: 0.7,
                max_tokens: 2048,
            }),
        });

        if (!response.ok) {
            return getDefaultLifestyleReport(moods);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content;

        try {
            return JSON.parse(content);
        } catch {
            return getDefaultLifestyleReport(moods);
        }
    } catch (error) {
        console.error('Lifestyle report error:', error);
        return getDefaultLifestyleReport(moods);
    }
}

function getDefaultLifestyleReport(moods) {
    const avgMood = moods.length > 0
        ? moods.reduce((a, m) => a + m.mood, 0) / moods.length
        : 3;

    return {
        introduction: `This personalized wellness plan is designed based on your unique patterns and needs. Your average mood over the tracking period is ${avgMood.toFixed(1)}/5.`,
    };
}
