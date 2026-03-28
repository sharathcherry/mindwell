// Local Storage Service for persistent data

const STORAGE_KEYS = {
    CONVERSATIONS: 'mindwell_conversations',
    USER_CONTEXT: 'mindwell_user_context',
    MOODS: 'mindwell_moods',
    JOURNALS: 'mindwell_journals',
    EXERCISES: 'mindwell_exercises',
};

// Generic storage helpers
export const storage = {
    get: (key) => {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : null;
        } catch (error) {
            console.error(`Error reading ${key} from localStorage:`, error);
            return null;
        }
    },

    set: (key, value) => {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.error(`Error writing ${key} to localStorage:`, error);
            return false;
        }
    },

    remove: (key) => {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.error(`Error removing ${key} from localStorage:`, error);
            return false;
        }
    },
};

// Conversation management
export const conversationStorage = {
    getAll: () => storage.get(STORAGE_KEYS.CONVERSATIONS) || [],

    save: (conversations) => storage.set(STORAGE_KEYS.CONVERSATIONS, conversations),

    addMessage: (message) => {
        const conversations = conversationStorage.getAll();
        conversations.push({
            ...message,
            id: Date.now(),
            timestamp: new Date().toISOString(),
        });
        conversationStorage.save(conversations);
        return conversations;
    },

    clear: () => {
        return storage.remove(STORAGE_KEYS.CONVERSATIONS);
    },
};

// User context for agentic behavior
export const userContextStorage = {
    get: () => storage.get(STORAGE_KEYS.USER_CONTEXT) || {
        primaryConcerns: [],
        preferredTherapyStyles: [],
        triggers: [],
        copingStrategies: [],
        moodPattern: null,
        sessionCount: 0,
        totalMessages: 0,
        lastInteraction: null,
        insights: [],
    },

    update: (updates) => {
        const current = userContextStorage.get();
        const updated = { ...current, ...updates, lastInteraction: new Date().toISOString() };
        storage.set(STORAGE_KEYS.USER_CONTEXT, updated);
        return updated;
    },

    addInsight: (insight) => {
        const current = userContextStorage.get();
        current.insights.push({
            text: insight,
            timestamp: new Date().toISOString(),
        });
        if (current.insights.length > 50) {
            current.insights = current.insights.slice(-50);
        }
        storage.set(STORAGE_KEYS.USER_CONTEXT, current);
    },

    incrementSession: () => {
        const current = userContextStorage.get();
        current.sessionCount += 1;
        storage.set(STORAGE_KEYS.USER_CONTEXT, current);
    },
};

// Mood tracking
export const moodStorage = {
    getAll: () => storage.get(STORAGE_KEYS.MOODS) || [],

    add: (mood) => {
        const moods = moodStorage.getAll();
        moods.push({
            ...mood,
            id: Date.now(),
            timestamp: new Date().toISOString(),
        });
        storage.set(STORAGE_KEYS.MOODS, moods);
        return moods;
    },

    getByDateRange: (startDate, endDate) => {
        const moods = moodStorage.getAll();
        return moods.filter(m => {
            const date = new Date(m.timestamp);
            return date >= startDate && date <= endDate;
        });
    },

    getLast30Days: () => {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return moodStorage.getByDateRange(thirtyDaysAgo, now);
    },
};

// Journal entries
export const journalStorage = {
    getAll: () => storage.get(STORAGE_KEYS.JOURNALS) || [],

    add: (entry) => {
        const journals = journalStorage.getAll();
        journals.unshift({
            ...entry,
            id: Date.now(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        });
        storage.set(STORAGE_KEYS.JOURNALS, journals);
        return journals;
    },

    update: (id, updates) => {
        const journals = journalStorage.getAll();
        const index = journals.findIndex(j => j.id === id);
        if (index !== -1) {
            journals[index] = {
                ...journals[index],
                ...updates,
                updatedAt: new Date().toISOString()
            };
            storage.set(STORAGE_KEYS.JOURNALS, journals);
        }
        return journals;
    },

    delete: (id) => {
        const journals = journalStorage.getAll().filter(j => j.id !== id);
        storage.set(STORAGE_KEYS.JOURNALS, journals);
        return journals;
    },

    search: (query) => {
        const journals = journalStorage.getAll();
        const lowerQuery = query.toLowerCase();
        return journals.filter(j =>
            j.title?.toLowerCase().includes(lowerQuery) ||
            j.content?.toLowerCase().includes(lowerQuery)
        );
    },
};

// Exercise completion tracking
export const exerciseStorage = {
    getAll: () => storage.get(STORAGE_KEYS.EXERCISES) || [],

    log: (exercise) => {
        const exercises = exerciseStorage.getAll();
        exercises.push({
            ...exercise,
            id: Date.now(),
            completedAt: new Date().toISOString(),
        });
        storage.set(STORAGE_KEYS.EXERCISES, exercises);
        return exercises;
    },

    getStreak: () => {
        const exercises = exerciseStorage.getAll();
        if (exercises.length === 0) return 0;

        let streak = 0;
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        for (let i = 0; i <= 365; i++) {
            const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
            const hasExercise = exercises.some(e => {
                const exerciseDate = new Date(e.completedAt);
                exerciseDate.setHours(0, 0, 0, 0);
                return exerciseDate.getTime() === checkDate.getTime();
            });

            if (hasExercise) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }
        return streak;
    },
};
