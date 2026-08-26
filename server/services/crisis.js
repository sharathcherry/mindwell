/**
 * Deterministic Crisis Triage Engine & Regional Hotline Directory
 * Fast fail-safe keyword matching (<1ms, sub-50ms requirement)
 * Multi-country emergency routing (US, GB, IN, CA, AU, DEFAULT)
 * Evidence-based CBT 5-4-3-2-1 Grounding Protocol
 */

export const HOTLINES_BY_REGION = {
    US: [
        { name: '988 Suicide & Crisis Lifeline', contact: 'Call or text 988', availability: '24/7' },
        { name: 'Crisis Text Line', contact: 'Text HOME to 741741', availability: '24/7' },
    ],
    GB: [
        { name: 'Samaritans', contact: 'Call 116 123', availability: '24/7' },
        { name: 'SHOUT', contact: 'Text SHOUT to 85258', availability: '24/7' },
    ],
    IN: [
        { name: 'Kiran Mental Health Helpline', contact: 'Call 1800-599-0019', availability: '24/7' },
        { name: 'AASRA', contact: 'Call +91-22-2754-6669', availability: '24/7' },
    ],
    CA: [
        { name: 'Suicide Crisis Helpline', contact: 'Call or text 988', availability: '24/7' },
        { name: 'Crisis Services Canada', contact: 'Call 1-833-456-4566', availability: '24/7' },
    ],
    AU: [
        { name: 'Lifeline', contact: 'Call 13 11 14', availability: '24/7' },
        { name: 'Beyond Blue', contact: 'Call 1300 22 4636', availability: '24/7' },
    ],
    DEFAULT: [
        { name: 'International Emergency', contact: 'Call your local emergency number now', availability: 'Immediate' },
        { name: 'Befrienders Worldwide', contact: 'https://www.befrienders.org', availability: 'Directory' },
    ],
};

export const EMERGENCY_BY_REGION = {
    US: '911',
    GB: '999',
    IN: '112',
    CA: '911',
    AU: '000',
    DEFAULT: '112',
};

export const CBT_GROUNDING_STEPS = [
    'Pause and take one slow breath in for 4 seconds, then out for 6 seconds.',
    'Name 5 things you can see, 4 you can touch, 3 you can hear, 2 you can smell, 1 you can taste.',
    'Say one balanced thought: "I am in a hard moment, but I can take one safe next step."',
    'Choose one immediate action: call a hotline, text a trusted person, or move to a safer place.',
];

export const CRISIS_FAILSAFE_KEYWORDS = [
    'suicide',
    'kill myself',
    'end my life',
    "don't want to live",
    'self harm',
    'hurt myself',
    'want to die',
    'take my life',
    'better off dead',
    'end it all',
];

function normalizeCountryCode(value) {
    if (typeof value !== 'string') {
        return '';
    }

    const cleaned = value.trim().toUpperCase();
    if (cleaned.length === 2) {
        return cleaned;
    }
    return '';
}

function countryFromLocale(locale) {
    if (typeof locale !== 'string') {
        return '';
    }
    const parts = locale.split('-');
    if (parts.length < 2) {
        return '';
    }
    return normalizeCountryCode(parts[parts.length - 1]);
}

function countryFromTimezone(timezone) {
    if (typeof timezone !== 'string') {
        return '';
    }

    if (timezone.includes('America/') || timezone.includes('US/')) {
        return 'US';
    }
    if (timezone.includes('Europe/London')) {
        return 'GB';
    }
    if (timezone.includes('Asia/Kolkata') || timezone.includes('Asia/Calcutta')) {
        return 'IN';
    }
    if (timezone.includes('Canada/') || timezone.includes('America/Toronto') || timezone.includes('America/Vancouver')) {
        return 'CA';
    }
    if (timezone.includes('Australia/')) {
        return 'AU';
    }

    return '';
}

/**
 * Fast sub-millisecond keyword check (<0.1ms)
 */
export function isCrisisMessage(message) {
    if (typeof message !== 'string' || message.length === 0) {
        return false;
    }
    const lower = message.toLowerCase();
    return CRISIS_FAILSAFE_KEYWORDS.some((kw) => lower.includes(kw));
}

/**
 * Evaluate deterministic crisis risk
 */
export function evaluateCrisisRisk(message, userContext = {}) {
    const hasKeyword = isCrisisMessage(message);
    const riskLevel = hasKeyword ? 'imminent' : (userContext.lastCrisisRiskLevel || 'low');
    const reasons = hasKeyword ? ['keyword_match_failsafe'] : [];

    return {
        isCrisis: hasKeyword,
        riskLevel,
        reasons,
    };
}

export function resolveCrisisRegion(userContext = {}) {
    const candidates = [
        normalizeCountryCode(userContext.countryCode),
        normalizeCountryCode(userContext.country),
        countryFromLocale(userContext.locale),
        countryFromTimezone(userContext.timezone),
    ];

    const region = candidates.find((code) => HOTLINES_BY_REGION[code]) || 'DEFAULT';
    return region;
}

function formatHotlines(hotlines) {
    return hotlines
        .map((line) => `- ${line.name}: ${line.contact} (${line.availability})`)
        .join('\n');
}

function formatGroundingSteps(steps) {
    return steps
        .map((step, index) => `${index + 1}. ${step}`)
        .join('\n');
}

export function buildCrisisResponse(userContext = {}, assessment = {}) {
    const region = resolveCrisisRegion(userContext);
    const hotlines = HOTLINES_BY_REGION[region] || HOTLINES_BY_REGION.DEFAULT;
    const emergencyNumber = EMERGENCY_BY_REGION[region] || EMERGENCY_BY_REGION.DEFAULT;
    const riskLevel = assessment.riskLevel || 'high';
    const reasons = Array.isArray(assessment.reasons) ? assessment.reasons : [];

    const message = [
        "I'm really glad you shared this. Your safety matters, and you do not have to handle this alone.",
        '',
        `If you might act on these thoughts, call emergency services now (${emergencyNumber}) or contact a crisis line immediately:`,
        formatHotlines(hotlines),
        '',
        'Try this quick CBT grounding routine right now:',
        formatGroundingSteps(CBT_GROUNDING_STEPS),
        '',
        'If possible, reply with one word: "safe" or "unsafe", so I can guide your next step.',
    ].join('\n');

    return {
        message,
        insights: ['User expressed crisis-related concerns'],
        contextUpdates: {
            primaryConcerns: [...(userContext.primaryConcerns || []), 'crisis-support-needed'],
            lastCrisisRiskLevel: riskLevel,
            lastCrisisRegion: region,
        },
        crisis: {
            riskLevel,
            reasons,
            region,
            emergencyNumber,
            hotlines,
            grounding: {
                approach: 'cbt-5-4-3-2-1-plus-breathing',
                steps: CBT_GROUNDING_STEPS,
            },
        },
    };
}
