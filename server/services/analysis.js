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

/**
 * Two-Tier Semantic-Acoustic Multimodal Fusion Engine
 * Cross-references acoustic vocal biomarkers with semantic message content to identify:
 * 1. Emotional Congruence (Acoustic + Semantic agree)
 * 2. Masked Distress (Spoken text claims "fine/okay", but voice reveals distress/sadness/fear)
 * 3. Affective Sarcasm / Strain (Positive text with angry/stressed vocal cues)
 */
export function fuseMultimodalEmotion(semanticAnalysis, userContext = {}) {
    const acousticEmotion = userContext.detectedVoiceEmotion;
    const rawConfidence = typeof userContext.emotionConfidence === 'number' ? userContext.emotionConfidence : null;
    const acousticProbabilities = userContext.allAcousticEmotions || {};

    const semanticEmotions = semanticAnalysis.detected || [];

    // If no voice telemetry is present, return pure semantic analysis
    if (!acousticEmotion || rawConfidence === null) {
        return {
            ...semanticAnalysis,
            fusion: {
                primaryEmotion: semanticEmotions[0] || 'neutral',
                confidence: semanticEmotions.length > 0 ? 0.75 : 0.5,
                mode: 'semantic_only',
                isCongruent: true,
                isMaskedDistress: false,
                acousticTelemetry: null,
            },
        };
    }

    // Mapping between acoustic labels and clinical semantic buckets
    const acousticToSemanticMap = {
        sadness: 'depression',
        sad: 'depression',
        anger: 'anger',
        angry: 'anger',
        fear: 'fear',
        fearful: 'fear',
        anxiety: 'anxiety',
        anxious: 'anxiety',
        happiness: 'positive',
        happy: 'positive',
        neutral: 'neutral',
        surprised: 'anxiety',
        disgust: 'anger',
    };

    const normalizedAcoustic = acousticToSemanticMap[acousticEmotion.toLowerCase()] || acousticEmotion.toLowerCase();
    const isSemanticPositive = semanticEmotions.includes('positive');
    const isSemanticNegative = semanticEmotions.some((e) => ['depression', 'anxiety', 'anger', 'fear'].includes(e));
    const isAcousticNegative = ['depression', 'anxiety', 'anger', 'fear'].includes(normalizedAcoustic);

    // Detect Incongruence: Masked Distress
    // User says positive/neutral words (e.g. "I'm fine", "All good") but voice shows acute negative emotion
    const isMaskedDistress = (isSemanticPositive || semanticEmotions.length === 0) &&
        isAcousticNegative &&
        rawConfidence >= 0.55;

    // Detect Incongruence: Sarcasm / Frustration
    const isSarcasticStrain = isSemanticPositive && normalizedAcoustic === 'anger' && rawConfidence >= 0.55;

    // Calculate Fused Primary Emotion & Calibrated Confidence
    let primaryEmotion;
    let calibratedConfidence;
    let mode;

    if (isMaskedDistress) {
        // Acoustic signal takes precedence in masked distress
        primaryEmotion = normalizedAcoustic;
        calibratedConfidence = Math.min(0.95, Number((rawConfidence * 1.1).toFixed(2)));
        mode = 'acoustic_dominant_masked_distress';
    } else if (semanticEmotions.includes(normalizedAcoustic)) {
        // Congruent state: Both voice and text agree
        primaryEmotion = normalizedAcoustic;
        calibratedConfidence = Math.min(0.99, Number((rawConfidence * 0.5 + 0.5).toFixed(2)));
        mode = 'multimodal_congruent';
    } else if (rawConfidence >= 0.70) {
        // Strong acoustic signal
        primaryEmotion = normalizedAcoustic;
        calibratedConfidence = Number(rawConfidence.toFixed(2));
        mode = 'acoustic_dominant';
    } else if (semanticEmotions.length > 0) {
        // Fall back to semantic primary
        primaryEmotion = semanticEmotions[0];
        calibratedConfidence = 0.75;
        mode = 'semantic_dominant';
    } else {
        primaryEmotion = normalizedAcoustic || 'neutral';
        calibratedConfidence = Number((rawConfidence || 0.5).toFixed(2));
        mode = 'balanced_fusion';
    }

    const updatedDetected = [...semanticEmotions];
    if (primaryEmotion !== 'neutral' && !updatedDetected.includes(primaryEmotion)) {
        updatedDetected.unshift(primaryEmotion);
    }

    return {
        ...semanticAnalysis,
        detected: updatedDetected,
        voiceDetected: acousticEmotion,
        voiceConfidence: rawConfidence,
        fusion: {
            primaryEmotion,
            normalizedAcoustic,
            confidence: calibratedConfidence,
            mode,
            isCongruent: semanticEmotions.includes(normalizedAcoustic),
            isMaskedDistress,
            isSarcasticStrain,
            acousticTelemetry: {
                rawEmotion: acousticEmotion,
                rawConfidence,
                probabilities: acousticProbabilities,
            },
        },
    };
}

export function mergeVoiceEmotion(analysis, userContext) {
    return fuseMultimodalEmotion(analysis, userContext);
}
