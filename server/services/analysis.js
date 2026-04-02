const EMOTIONS = {
    anxiety: ['anxious', 'worried', 'nervous', 'panic', 'stress', 'stressed', 'overwhelmed'],
    depression: ['sad', 'depressed', 'hopeless', 'worthless', 'empty', 'numb', 'tired'],
    anger: ['angry', 'frustrated', 'irritated', 'mad', 'annoyed'],
    fear: ['scared', 'afraid', 'terrified', 'fearful'],
    positive: ['happy', 'good', 'great', 'excited', 'grateful', 'hopeful', 'better'],
};

const CRISIS_KEYWORDS = ['suicide', 'kill myself', 'end my life', "don't want to live", 'self harm', 'hurt myself'];

const THERAPY_KEYWORDS = {
    cbt: ['thought', 'thinking', 'cognitive', 'pattern', 'reframe'],
    mindfulness: ['breathe', 'present', 'meditation', 'mindful', 'calm'],
    supportive: ['listen', 'talk', 'vent', 'express', 'share'],
};

export function analyzeMessage(message) {
    const lowercaseMessage = message.toLowerCase();

    const detected = [];
    for (const [emotion, keywords] of Object.entries(EMOTIONS)) {
        if (keywords.some((keyword) => lowercaseMessage.includes(keyword))) {
            detected.push(emotion);
        }
    }

    const hasCrisisIndicator = CRISIS_KEYWORDS.some((keyword) => lowercaseMessage.includes(keyword));

    return { detected, hasCrisisIndicator };
}

export function extractTherapyInsights(message) {
    const lowerMessage = message.toLowerCase();
    const detectedStyles = [];

    for (const [style, keywords] of Object.entries(THERAPY_KEYWORDS)) {
        if (keywords.some((keyword) => lowerMessage.includes(keyword))) {
            detectedStyles.push(style);
        }
    }

    const contextUpdates = {};
    if (detectedStyles.length > 0) {
        contextUpdates.preferredTherapyStyles = detectedStyles;
    }

    return {
        insights: detectedStyles.length > 0 ? [`User expressed therapy style cues: ${detectedStyles.join(', ')}`] : [],
        contextUpdates,
    };
}

export function mergeVoiceEmotion(analysis, userContext) {
    if (!userContext.detectedVoiceEmotion || userContext.emotionConfidence <= 0.5) {
        return analysis;
    }

    const emotionMap = {
        sadness: 'depression',
        anger: 'anger',
        happiness: 'positive',
        neutral: null,
    };

    const mappedEmotion = emotionMap[userContext.detectedVoiceEmotion];
    if (mappedEmotion && !analysis.detected.includes(mappedEmotion)) {
        analysis.detected.unshift(mappedEmotion);
    }

    analysis.voiceDetected = userContext.detectedVoiceEmotion;
    analysis.voiceConfidence = userContext.emotionConfidence;
    return analysis;
}
