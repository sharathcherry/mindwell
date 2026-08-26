import { getToken, refresh as authRefresh, logout as authLogout } from './auth.js';

const API_BASE = (import.meta.env?.VITE_API_BASE_URL && !import.meta.env.VITE_API_BASE_URL.includes('undefined'))
    ? import.meta.env.VITE_API_BASE_URL
    : '/api';

export async function parseErrorResponse(response, fallbackMessage = 'Request failed') {
    try {
        const payload = await response.json();
        return payload?.error || payload?.message || fallbackMessage;
    } catch {
        return fallbackMessage;
    }
}

/**
 * Authenticated fetch helper that injects Bearer token, enables cookies,
 * and intercepts 401 responses to auto-refresh access token and replay requests.
 */
export async function authenticatedFetch(endpoint, options = {}) {
    const url = endpoint.startsWith('http') ? endpoint : `${API_BASE}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
    const token = getToken();

    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token && !headers.Authorization && !headers.authorization) {
        headers.Authorization = `Bearer ${token}`;
    }

    const fetchOptions = {
        ...options,
        headers,
        credentials: options.credentials || 'include',
    };

    let response;
    try {
        response = await fetch(url, fetchOptions);
    } catch (networkError) {
        console.error('Network error on request:', networkError);
        throw networkError;
    }

    // Automatic 401 Token Refresh Interceptor
    if (response.status === 401 && !options._retry && !endpoint.includes('/auth/')) {
        try {
            const refreshResult = await authRefresh();
            const newToken = refreshResult?.accessToken || getToken();

            if (newToken) {
                const retryHeaders = {
                    ...headers,
                    Authorization: `Bearer ${newToken}`,
                };

                const retryOptions = {
                    ...options,
                    _retry: true,
                    headers: retryHeaders,
                    credentials: 'include',
                };

                return await fetch(url, retryOptions);
            }
        } catch (refreshErr) {
            console.warn('Auto refresh failed, session expired:', refreshErr);
            authLogout();
        }
    }

    return response;
}

export const chatApi = {
    /**
     * Streaming chat — calls onDelta(text) for each token as it arrives.
     * Returns final metadata { fusion, provider, insights, contextUpdates } when stream ends.
     */
    sendMessageStream: async (message, conversationHistory, userContext, onDelta) => {
        const url = `${API_BASE}/chat`;
        let token = getToken();

        const headers = { 'Content-Type': 'application/json' };
        if (token) headers.Authorization = `Bearer ${token}`;

        let response = await fetch(url, {
            method: 'POST',
            headers,
            credentials: 'include',
            body: JSON.stringify({ message, conversationHistory, userContext }),
        });

        // 401 Token Refresh Interceptor for Streaming
        if (response.status === 401) {
            try {
                const refreshResult = await authRefresh();
                token = refreshResult?.accessToken || getToken();
                if (token) {
                    headers.Authorization = `Bearer ${token}`;
                    response = await fetch(url, {
                        method: 'POST',
                        headers,
                        credentials: 'include',
                        body: JSON.stringify({ message, conversationHistory, userContext }),
                    });
                }
            } catch (refErr) {
                console.warn('Stream token refresh failed:', refErr);
            }
        }

        if (!response.ok) {
            throw new Error(await parseErrorResponse(response, 'Failed to get response'));
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let metadata = {};

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop(); // keep incomplete line

            let eventType = null;
            for (const line of lines) {
                if (line.startsWith('event: ')) {
                    eventType = line.slice(7).trim();
                } else if (line.startsWith('data: ')) {
                    try {
                        const payload = JSON.parse(line.slice(6));
                        if (eventType === 'delta' && payload.delta) {
                            onDelta(payload.delta);
                        } else if (eventType === 'done') {
                            metadata = payload;
                        } else if (eventType === 'error') {
                            throw new Error(payload.error || 'Stream error');
                        }
                    } catch (e) {
                        if (e.message !== 'Stream error' && !e.message.includes('JSON')) throw e;
                    }
                    eventType = null;
                }
            }
        }

        return metadata;
    },

    // Non-streaming fallback (kept for compatibility)
    sendMessage: async (message, conversationHistory, userContext) => {
        const response = await authenticatedFetch('/chat', {
            method: 'POST',
            body: JSON.stringify({ message, conversationHistory, userContext }),
        });
        if (!response.ok) throw new Error(await parseErrorResponse(response, 'Failed to get response'));
        return await response.json();
    },
};


export const reportsApi = {
    generateTherapyReport: async (userContext, conversationHistory, moods) => {
        try {
            const response = await authenticatedFetch('/reports/therapy', {
                method: 'POST',
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
            const response = await authenticatedFetch('/reports/lifestyle', {
                method: 'POST',
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

export const moodsApi = {
    getAll: async (params = {}) => {
        const query = new URLSearchParams(params).toString();
        const endpoint = query ? `/moods?${query}` : '/moods';
        const response = await authenticatedFetch(endpoint, { method: 'GET' });

        if (!response.ok) {
            throw new Error(await parseErrorResponse(response, 'Failed to fetch moods'));
        }

        const data = await response.json();
        return data.moods || data;
    },

    add: async (moodData) => {
        const response = await authenticatedFetch('/moods', {
            method: 'POST',
            body: JSON.stringify(moodData),
        });

        if (!response.ok) {
            throw new Error(await parseErrorResponse(response, 'Failed to log mood'));
        }

        const data = await response.json();
        return data.mood || data.moodLog || data;
    },

    delete: async (id) => {
        const response = await authenticatedFetch(`/moods/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(await parseErrorResponse(response, 'Failed to delete mood'));
        }

        return await response.json();
    },
};

export const journalsApi = {
    getAll: async (q = '') => {
        const endpoint = q ? `/journals?q=${encodeURIComponent(q)}` : '/journals';
        const response = await authenticatedFetch(endpoint, { method: 'GET' });

        if (!response.ok) {
            throw new Error(await parseErrorResponse(response, 'Failed to fetch journals'));
        }

        const data = await response.json();
        return data.journals || data;
    },

    add: async (entryData) => {
        const response = await authenticatedFetch('/journals', {
            method: 'POST',
            body: JSON.stringify(entryData),
        });

        if (!response.ok) {
            throw new Error(await parseErrorResponse(response, 'Failed to save journal entry'));
        }

        const data = await response.json();
        return data.journal || data.journalEntry || data;
    },

    update: async (id, updates) => {
        const response = await authenticatedFetch(`/journals/${id}`, {
            method: 'PUT',
            body: JSON.stringify(updates),
        });

        if (!response.ok) {
            throw new Error(await parseErrorResponse(response, 'Failed to update journal entry'));
        }

        const data = await response.json();
        return data.journal || data.journalEntry || data;
    },

    delete: async (id) => {
        const response = await authenticatedFetch(`/journals/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(await parseErrorResponse(response, 'Failed to delete journal entry'));
        }

        return await response.json();
    },
};

export const conversationsApi = {
    getAll: async () => {
        const response = await authenticatedFetch('/conversations', { method: 'GET' });

        if (!response.ok) {
            throw new Error(await parseErrorResponse(response, 'Failed to fetch conversations'));
        }

        const data = await response.json();
        return data.conversations || data;
    },

    getMessages: async (id) => {
        const response = await authenticatedFetch(`/conversations/${id}/messages`, { method: 'GET' });

        if (!response.ok) {
            throw new Error(await parseErrorResponse(response, 'Failed to fetch messages'));
        }

        const data = await response.json();
        return data.messages || data;
    },

    create: async (conversationData) => {
        const response = await authenticatedFetch('/conversations', {
            method: 'POST',
            body: JSON.stringify(conversationData),
        });

        if (!response.ok) {
            throw new Error(await parseErrorResponse(response, 'Failed to create conversation'));
        }

        const data = await response.json();
        return data.conversation || data;
    },

    addMessage: async (id, messageData) => {
        const response = await authenticatedFetch(`/conversations/${id}/messages`, {
            method: 'POST',
            body: JSON.stringify(messageData),
        });

        if (!response.ok) {
            throw new Error(await parseErrorResponse(response, 'Failed to save message'));
        }

        const data = await response.json();
        return data.message || data;
    },

    delete: async (id) => {
        const response = await authenticatedFetch(`/conversations/${id}`, {
            method: 'DELETE',
        });

        if (!response.ok) {
            throw new Error(await parseErrorResponse(response, 'Failed to delete conversation'));
        }

        return await response.json();
    },
};
