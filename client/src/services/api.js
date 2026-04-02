const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

async function parseErrorResponse(response, fallbackMessage) {
    try {
        const payload = await response.json();
        return payload?.error || payload?.message || fallbackMessage;
    } catch {
        return fallbackMessage;
    }
}

export const chatApi = {
    sendMessage: async (message, conversationHistory, userContext) => {
        try {
            const response = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    message,
                    conversationHistory,
                    userContext,
                }),
            });

            if (!response.ok) {
                throw new Error(await parseErrorResponse(response, 'Failed to get response'));
            }

            const data = await response.json();
            return data;
        } catch (error) {
            console.error('Chat API error:', error);
            throw error;
        }
    },
};

export const reportsApi = {
    generateTherapyReport: async (userContext, conversationHistory, moods) => {
        try {
            const response = await fetch(`${API_BASE}/reports/therapy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userContext,
                    conversationHistory,
                    moods,
                }),
            });

            if (!response.ok) {
                throw new Error(await parseErrorResponse(response, 'Failed to generate therapy report'));
            }

            return await response.json();
        } catch (error) {
            console.error('Therapy report API error:', error);
            throw error;
        }
    },

    generateLifestyleReport: async (userContext, moods, journals) => {
        try {
            const response = await fetch(`${API_BASE}/reports/lifestyle`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    userContext,
                    moods,
                    journals,
                }),
            });

            if (!response.ok) {
                throw new Error(await parseErrorResponse(response, 'Failed to generate lifestyle report'));
            }

            return await response.json();
        } catch (error) {
            console.error('Lifestyle report API error:', error);
            throw error;
        }
    },
};
