import { getSystemPrompt, getReportPrompt } from './prompts.js';
import { analyzeMessage, analyzeMessageAsync, extractTherapyInsights, mergeVoiceEmotion } from './analysis.js';
import { buildCrisisResponse } from './crisis.js';
import { getFallbackResponse } from './fallback.js';

/**
 * Dynamic Provider Cascade Priority Order:
 * 1. Google Gemini 3.6 Flash (Multimodal, 1500 req/day free)
 * 2. Groq Qwen 3.8 27B (High-speed LPU free tier)
 * 4. Local Heuristics / Deterministic Fallbacks
 */
export function getProviderCascade() {
    const providers = [];

    // 1. Google Gemini 3.6 Flash
    if (process.env.GEMINI_API_KEY) {
        providers.push({
            name: 'Gemini 3.6 Flash',
            apiUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
            model: 'gemini-3.6-flash',
            apiKey: process.env.GEMINI_API_KEY,
            provider: 'Gemini 3.6 Flash (Multimodal)',
        });
    }

    // 2. Groq Qwen 3.8 27B
    if (process.env.GROQ_API_KEY) {
        providers.push({
            name: 'Groq Qwen 3.8 27B',
            apiUrl: 'https://api.groq.com/openai/v1/chat/completions',
            model: 'qwen/qwen3.8-27b',
            apiKey: process.env.GROQ_API_KEY,
            provider: 'Groq Cloud (Qwen 3.8 27B)',
        });
    }

    return providers;
}

export function resolveAIConfig() {
    const providers = getProviderCascade();
    return providers.length > 0 ? providers[0] : null;
}

export function parseAssessmentPayload(content) {
    if (!content || typeof content !== 'string') {
        return null;
    }

    try {
        return JSON.parse(content);
    } catch {
        const start = content.indexOf('{');
        const end = content.lastIndexOf('}');
        if (start === -1 || end === -1 || end <= start) {
            return null;
        }

        try {
            return JSON.parse(content.slice(start, end + 1));
        } catch {
            return null;
        }
    }
}

export async function assessCrisisRisk(message, conversationHistory = [], userContext = {}, analysis = null) {
    const keywordTriggered = Boolean(analysis?.hasCrisisIndicator);
    const providers = getProviderCascade();

    if (providers.length === 0) {
        return {
            hasCrisisIndicator: keywordTriggered,
            riskLevel: keywordTriggered ? 'high' : 'low',
            reasons: keywordTriggered ? ['keyword_match'] : [],
            source: 'keyword',
        };
    }

    const recentContext = conversationHistory
        .slice(-6)
        .map((entry) => `${entry.role === 'assistant' ? 'assistant' : 'user'}: ${entry.content}`)
        .join('\n')
        .slice(0, 1500);

    const prompt = [
        'You are a crisis triage classifier for mental health chat safety.',
        'Classify suicide/self-harm risk from the latest user message and short context.',
        'Return JSON only with: {"is_crisis": boolean, "risk_level": "low|medium|high|imminent", "reasons": string[]}.',
        'Mark is_crisis=true for explicit or strongly implied self-harm/suicidal intent, plans, or inability to stay safe.',
        '',
        `User locale context: ${JSON.stringify({ locale: userContext?.locale, countryCode: userContext?.countryCode, timezone: userContext?.timezone })}`,
        `Recent context:\n${recentContext || 'none'}`,
        `Latest user message:\n${message}`,
    ].join('\n');

    for (const provider of providers) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 8000);

            const response = await fetch(provider.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${provider.apiKey}`,
                },
                body: JSON.stringify({
                    model: provider.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0,
                    max_tokens: 180,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                console.warn(`[Crisis Assessment] Provider ${provider.name} HTTP ${response.status}: ${errText.slice(0, 120)}. Cascading to next provider...`);
                continue;
            }

            const data = await response.json();
            const payload = parseAssessmentPayload(data?.choices?.[0]?.message?.content);
            if (!payload || typeof payload !== 'object') {
                console.warn(`[Crisis Assessment] Provider ${provider.name} returned non-JSON payload. Cascading...`);
                continue;
            }

            const isCrisis = Boolean(payload?.is_crisis) || keywordTriggered;
            const riskLevel = ['low', 'medium', 'high', 'imminent'].includes(payload?.risk_level)
                ? payload.risk_level
                : (isCrisis ? 'high' : 'low');
            const reasons = Array.isArray(payload?.reasons)
                ? payload.reasons.filter((item) => typeof item === 'string').slice(0, 5)
                : (keywordTriggered ? ['keyword_match'] : []);

            return {
                hasCrisisIndicator: isCrisis,
                riskLevel,
                reasons,
                source: `llm_${provider.model}`,
                provider: provider.provider,
            };
        } catch (error) {
            console.warn(`[Crisis Assessment] Provider ${provider.name} network/timeout error: ${error.message}. Cascading...`);
            continue;
        }
    }

    return {
        hasCrisisIndicator: keywordTriggered,
        riskLevel: keywordTriggered ? 'high' : 'low',
        reasons: keywordTriggered ? ['keyword_match'] : [],
        source: 'keyword-fallback',
    };
}

export async function chatWithAI(message, conversationHistory = [], userContext = {}) {
    // Run keyword analysis + HuggingFace in parallel — don't await sequentially
    const [rawAnalysis] = await Promise.all([
        analyzeMessageAsync(message),
    ]);
    const analysis = mergeVoiceEmotion(rawAnalysis, userContext);
    const enrichedContext = {
        ...userContext,
        fusion: analysis.fusion,
        hfEmotion: rawAnalysis.hfClassification || null,
    };

    // Only call the LLM crisis classifier if keyword scan flagged something.
    // For normal messages skip it entirely — saves 1-2s per request.
    let crisisAssessment;
    if (analysis.hasCrisisIndicator) {
        crisisAssessment = await assessCrisisRisk(
            message,
            conversationHistory,
            enrichedContext,
            analysis
        );
    } else {
        crisisAssessment = { hasCrisisIndicator: false, riskLevel: 'low', source: 'keyword-clear' };
    }

    // Handle crisis situation immediately
    if (crisisAssessment.hasCrisisIndicator) {
        return buildCrisisResponse(enrichedContext, crisisAssessment);
    }

    const providers = getProviderCascade();

    // If no AI key configured, use deterministic fallback
    if (providers.length === 0) {
        return {
            ...getFallbackResponse(message, analysis, enrichedContext),
            fusion: analysis.fusion,
        };
    }

    const systemPrompt = getSystemPrompt(enrichedContext);
    const messages = [
        { role: 'system', content: systemPrompt },
    ];

    // Add recent conversation history (last 8 messages for speed)
    const recentHistory = conversationHistory.slice(-8);
    for (const msg of recentHistory) {
        messages.push({
            role: msg.role === 'assistant' ? 'assistant' : 'user',
            content: msg.content,
        });
    }

    // Add current user message
    messages.push({ role: 'user', content: message });

    for (const provider of providers) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 12000);

            const response = await fetch(provider.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${provider.apiKey}`,
                },
                body: JSON.stringify({
                    model: provider.model,
                    messages,
                    temperature: 0.7,
                    max_tokens: 300,  // Was 1024 — shorter responses = faster
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text().catch(() => '');
                console.warn(`[AI Chat Cascade] Provider ${provider.name} failed (HTTP ${response.status}): ${errorText.slice(0, 150)}. Cascading to next provider...`);
                continue;
            }

            const data = await response.json();
            const aiMessage = data.choices?.[0]?.message?.content;
            if (!aiMessage || typeof aiMessage !== 'string' || !aiMessage.trim()) {
                console.warn(`[AI Chat Cascade] Provider ${provider.name} returned empty content. Cascading...`);
                continue;
            }

            // Extract therapeutic insights from exchange
            const { insights, contextUpdates } = extractTherapyInsights(message);

            return {
                message: aiMessage.trim(),
                insights,
                contextUpdates,
                fusion: analysis.fusion,
                provider: provider.provider,
            };
        } catch (error) {
            console.warn(`[AI Chat Cascade] Provider ${provider.name} error (${error.message}). Cascading to next provider...`);
            continue;
        }
    }

    // All cascade providers failed or exhausted -> local heuristic fallback
    console.warn('[AI Chat Cascade] All cascade AI providers exhausted. Using local heuristic fallback.');
    return {
        ...getFallbackResponse(message, analysis, enrichedContext),
        fusion: analysis.fusion,
    };
}

export async function generateTherapyReport(userContext = {}, conversationHistory = [], moods = []) {
    const providers = getProviderCascade();
    if (providers.length === 0) {
        return getDefaultTherapyReport(userContext, conversationHistory);
    }

    const prompt = getReportPrompt('therapy', userContext, conversationHistory, moods);

    for (const provider of providers) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            const response = await fetch(provider.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${provider.apiKey}`,
                },
                body: JSON.stringify({
                    model: provider.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 2048,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                console.warn(`[Therapy Report Cascade] Provider ${provider.name} failed (HTTP ${response.status}): ${errText.slice(0, 150)}. Cascading...`);
                continue;
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            const parsed = parseAssessmentPayload(content);
            if (parsed && typeof parsed === 'object' && Array.isArray(parsed.therapies)) {
                return parsed;
            }
            console.warn(`[Therapy Report Cascade] Provider ${provider.name} returned invalid structure. Cascading...`);
        } catch (error) {
            console.warn(`[Therapy Report Cascade] Provider ${provider.name} error: ${error.message}. Cascading...`);
            continue;
        }
    }

    return getDefaultTherapyReport(userContext, conversationHistory);
}

export function getDefaultTherapyReport(userContext = {}, conversationHistory = []) {
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

export async function generateLifestyleReport(userContext = {}, moods = [], journals = []) {
    const providers = getProviderCascade();
    if (providers.length === 0) {
        return getDefaultLifestyleReport(moods);
    }

    const prompt = getReportPrompt('lifestyle', userContext, null, moods, journals);

    for (const provider of providers) {
        try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 20000);

            const response = await fetch(provider.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${provider.apiKey}`,
                },
                body: JSON.stringify({
                    model: provider.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.7,
                    max_tokens: 2048,
                }),
                signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!response.ok) {
                const errText = await response.text().catch(() => '');
                console.warn(`[Lifestyle Report Cascade] Provider ${provider.name} failed (HTTP ${response.status}): ${errText.slice(0, 150)}. Cascading...`);
                continue;
            }

            const data = await response.json();
            const content = data.choices?.[0]?.message?.content;
            const parsed = parseAssessmentPayload(content);
            if (parsed && typeof parsed === 'object') {
                return parsed;
            }
            console.warn(`[Lifestyle Report Cascade] Provider ${provider.name} returned invalid structure. Cascading...`);
        } catch (error) {
            console.warn(`[Lifestyle Report Cascade] Provider ${provider.name} error: ${error.message}. Cascading...`);
            continue;
        }
    }

    return getDefaultLifestyleReport(moods);
}

export function getDefaultLifestyleReport(moods = []) {
    const avgMood = moods.length > 0
        ? moods.reduce((a, m) => a + m.mood, 0) / moods.length
        : 3;

    return {
        introduction: `This personalized wellness plan is designed based on your unique patterns and needs. Your average mood over the tracking period is ${avgMood.toFixed(1)}/5.`,
    };
}

