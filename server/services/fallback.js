export function getFallbackResponse(message, analysis) {
    const lowerMessage = message.toLowerCase();

    const greetings = ['hello', 'hi', 'hey', 'yo', 'good morning', 'good afternoon', 'good evening', 'are you there', 'anyone there'];
    const isGreeting = greetings.some((greeting) => lowerMessage === greeting || lowerMessage === `${greeting}?` || lowerMessage === `${greeting}!`);

    if (isGreeting) {
        return {
            message: "Hey! 👋 I'm here. How's your day going?",
            insights: [],
            contextUpdates: {},
        };
    }

    if (lowerMessage.includes('wtf') || lowerMessage.includes('what the') || lowerMessage.includes('huh')) {
        return {
            message: "Sorry if I'm not making sense! 😅 Let me try again - what's happening with you right now? Just tell me in your own words.",
            insights: [],
            contextUpdates: {},
        };
    }

    if (lowerMessage.includes('girl') || lowerMessage.includes('guy') || lowerMessage.includes('crush') ||
        lowerMessage.includes('date') || lowerMessage.includes('relationship') || lowerMessage.includes('the one') ||
        lowerMessage.includes('met someone') || lowerMessage.includes('boyfriend') || lowerMessage.includes('girlfriend')) {
        return {
            message: "Ooh, that's exciting! 💜 Tell me more about them! How did you meet? What makes them special?",
            insights: ['User mentioned relationship/dating'],
            contextUpdates: { currentTopic: 'relationships' },
        };
    }

    if (lowerMessage.includes('energetic') || lowerMessage.includes('excited') || lowerMessage.includes('pumped') ||
        lowerMessage.includes('amazing') || lowerMessage.includes('awesome') || lowerMessage.includes('great')) {
        return {
            message: "I love that energy! 🔥 What's got you feeling so good? Something happen recently?",
            insights: ['User expressing positive energy'],
            contextUpdates: {},
        };
    }

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
