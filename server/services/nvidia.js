import { getSystemPrompt, getReportPrompt } from './prompts.js';

const NVIDIA_API_URL = 'https://integrate.api.nvidia.com/v1/chat/completions';
const MODEL = 'meta/llama-3.1-70b-instruct';

// Analyze user message for emotional context
function analyzeMessage(message) {
    const lowercaseMessage = message.toLowerCase();

    const emotions = {
        anxiety: ['anxious', 'worried', 'nervous', 'panic', 'stress', 'stressed', 'overwhelmed'],
        depression: ['sad', 'depressed', 'hopeless', 'worthless', 'empty', 'numb', 'tired'],
        anger: ['angry', 'frustrated', 'irritated', 'mad', 'annoyed'],
        fear: ['scared', 'afraid', 'terrified', 'fearful'],
        positive: ['happy', 'good', 'great', 'excited', 'grateful', 'hopeful', 'better'],
    };

    const detected = [];
    for (const [emotion, keywords] of Object.entries(emotions)) {
        if (keywords.some(keyword => lowercaseMessage.includes(keyword))) {
            detected.push(emotion);
        }
    }

    // Check for crisis indicators
    const crisisKeywords = ['suicide', 'kill myself', 'end my life', 'don\'t want to live', 'self harm', 'hurt myself'];
    const hasCrisisIndicator = crisisKeywords.some(keyword => lowercaseMessage.includes(keyword));

    return { detected, hasCrisisIndicator };
}

// Extract insights from the conversation for context updates
function extractInsights(message, aiResponse) {
    const insights = [];
    const contextUpdates = {};

    // Simple keyword detection for therapy preferences
    const therapyKeywords = {
        cbt: ['thought', 'thinking', 'cognitive', 'pattern', 'reframe'],
        mindfulness: ['breathe', 'present', 'meditation', 'mindful', 'calm'],
        supportive: ['listen', 'talk', 'vent', 'express', 'share'],
    };

    const lowerMessage = message.toLowerCase();
    const detectedStyles = [];

    for (const [style, keywords] of Object.entries(therapyKeywords)) {
        if (keywords.some(k => lowerMessage.includes(k))) {
            detectedStyles.push(style);
        }
    }

    if (detectedStyles.length > 0) {
        contextUpdates.preferredTherapyStyles = detectedStyles;
    }

    return { insights, contextUpdates };
}

export async function chatWithAI(message, conversationHistory = [], userContext = {}) {
    const analysis = analyzeMessage(message);

    // If voice emotion was detected, use that as primary emotion source
    if (userContext.detectedVoiceEmotion && userContext.emotionConfidence > 0.5) {
        const voiceEmotion = userContext.detectedVoiceEmotion;
        // Map SpeechBrain emotions to our categories
        const emotionMap = {
            'sadness': 'depression',
            'anger': 'anger',
            'happiness': 'positive',
            'neutral': null
        };
        const mappedEmotion = emotionMap[voiceEmotion];
        if (mappedEmotion && !analysis.detected.includes(mappedEmotion)) {
            analysis.detected.unshift(mappedEmotion);
        }
        analysis.voiceDetected = voiceEmotion;
        analysis.voiceConfidence = userContext.emotionConfidence;
    }

    // Handle crisis situation
    if (analysis.hasCrisisIndicator) {
        return {
            message: `I'm really concerned about what you've shared. Your life matters, and I want you to know that help is available right now.

🆘 **If you're in immediate danger, please:**
- Call emergency services (911 in US, 999 in UK, 112 in EU/India)
- National Suicide Prevention Lifeline: 988 (US)
- Crisis Text Line: Text HOME to 741741

I'm here to listen, but I'm not a replacement for professional help. Would you be willing to reach out to one of these resources? 💜`,
            insights: ['User expressed crisis-related concerns'],
            contextUpdates: {
                primaryConcerns: [...(userContext.primaryConcerns || []), 'crisis-support-needed']
            },
        };
    }

    // If no API key, use fallback response
    if (!process.env.NVIDIA_API_KEY) {
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

        const response = await fetch(NVIDIA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
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
            console.error('NVIDIA API error:', error);
            return getFallbackResponse(message, analysis, userContext);
        }

        const data = await response.json();
        const aiMessage = data.choices?.[0]?.message?.content || getFallbackResponse(message, analysis, userContext).message;

        // Extract insights from the exchange
        const { insights, contextUpdates } = extractInsights(message, aiMessage);

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

function getFallbackResponse(message, analysis, userContext) {
    const lowerMessage = message.toLowerCase();

    // Check for greetings
    const greetings = ['hello', 'hi', 'hey', 'yo', 'good morning', 'good afternoon', 'good evening', 'are you there', 'anyone there'];
    const isGreeting = greetings.some(g => lowerMessage === g || lowerMessage === g + '?' || lowerMessage === g + '!');

    if (isGreeting) {
        return {
            message: "Hey! 👋 I'm here. How's your day going?",
            insights: [],
            contextUpdates: {},
        };
    }

    // Check for confusion or frustration with the bot
    if (lowerMessage.includes('wtf') || lowerMessage.includes('what the') || lowerMessage.includes('huh')) {
        return {
            message: "Sorry if I'm not making sense! 😅 Let me try again - what's happening with you right now? Just tell me in your own words.",
            insights: [],
            contextUpdates: {},
        };
    }

    // Check for relationship/dating topics
    if (lowerMessage.includes('girl') || lowerMessage.includes('guy') || lowerMessage.includes('crush') ||
        lowerMessage.includes('date') || lowerMessage.includes('relationship') || lowerMessage.includes('the one') ||
        lowerMessage.includes('met someone') || lowerMessage.includes('boyfriend') || lowerMessage.includes('girlfriend')) {
        return {
            message: "Ooh, that's exciting! 💜 Tell me more about them! How did you meet? What makes them special?",
            insights: ['User mentioned relationship/dating'],
            contextUpdates: { currentTopic: 'relationships' },
        };
    }

    // Check for energy/excitement
    if (lowerMessage.includes('energetic') || lowerMessage.includes('excited') || lowerMessage.includes('pumped') ||
        lowerMessage.includes('amazing') || lowerMessage.includes('awesome') || lowerMessage.includes('great')) {
        return {
            message: "I love that energy! 🔥 What's got you feeling so good? Something happen recently?",
            insights: ['User expressing positive energy'],
            contextUpdates: {},
        };
    }

    // Check for work/school stress
    if (lowerMessage.includes('work') || lowerMessage.includes('job') || lowerMessage.includes('school') ||
        lowerMessage.includes('exam') || lowerMessage.includes('project') || lowerMessage.includes('boss')) {
        return {
            message: "Work/school stuff can be intense. What's going on with that? Is it stressing you out or is something good happening?",
            insights: ['User mentioned work/school'],
            contextUpdates: { currentTopic: 'work' },
        };
    }

    const responses = {
        anxiety: [
            "That sounds stressful. 💙 What's making you feel anxious? Tell me what's going on.",
            "Anxiety is tough. What's happening that's got you feeling this way?",
        ],
        depression: [
            "I hear you. 💙 What's been weighing on you? I want to understand.",
            "That sounds hard. What's making you feel this way?",
        ],
        anger: [
            "Something really got to you, huh? What happened?",
            "I can tell you're frustrated. What's going on?",
        ],
        positive: [
            "That's awesome! 😊 What's making you feel good? Tell me about it!",
            "Love to hear it! What's going well for you?",
        ],
        default: [
            "Tell me more! What's on your mind?",
            "I'm curious - what made you want to share that?",
            "Go on, I'm listening. What else?",
        ],
    };

    // Select response based on detected emotions
    let responsePool = responses.default;
    if (analysis.detected.length > 0) {
        const primaryEmotion = analysis.detected[0];
        if (responses[primaryEmotion]) {
            responsePool = responses[primaryEmotion];
        }
    }

    const selectedResponse = responsePool[Math.floor(Math.random() * responsePool.length)];

    return {
        message: selectedResponse,
        insights: analysis.detected.length > 0 ? [`User expressed: ${analysis.detected.join(', ')}`] : [],
        contextUpdates: {},
    };
}

export async function generateTherapyReport(userContext, conversationHistory, moods) {
    if (!process.env.NVIDIA_API_KEY) {
        return getDefaultTherapyReport(userContext, conversationHistory);
    }

    try {
        const prompt = getReportPrompt('therapy', userContext, conversationHistory, moods);

        const response = await fetch(NVIDIA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
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
    if (!process.env.NVIDIA_API_KEY) {
        return getDefaultLifestyleReport(moods);
    }

    try {
        const prompt = getReportPrompt('lifestyle', userContext, null, moods, journals);

        const response = await fetch(NVIDIA_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.NVIDIA_API_KEY}`,
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
