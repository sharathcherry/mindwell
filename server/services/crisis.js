const CRISIS_MESSAGE = `I'm really concerned about what you've shared. Your life matters, and I want you to know that help is available right now.

🆘 **If you're in immediate danger, please:**
- Call emergency services (911 in US, 999 in UK, 112 in EU/India)
- National Suicide Prevention Lifeline: 988 (US)
- Crisis Text Line: Text HOME to 741741

I'm here to listen, but I'm not a replacement for professional help. Would you be willing to reach out to one of these resources? 💜`;

export function buildCrisisResponse(userContext = {}) {
    return {
        message: CRISIS_MESSAGE,
        insights: ['User expressed crisis-related concerns'],
        contextUpdates: {
            primaryConcerns: [...(userContext.primaryConcerns || []), 'crisis-support-needed'],
        },
    };
}

