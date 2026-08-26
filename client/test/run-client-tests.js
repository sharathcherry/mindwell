import assert from 'node:assert/strict';

/**
 * MindWell Comprehensive Client-Tier Test Suite
 * Covers:
 * 1. Client Storage Adapter & Sub-Storage Modules (Conversations, UserContext, Moods, Journals, Exercises, Streaks)
 * 2. Client Cryptography & Password Hashing Engine (PBKDF2 SHA-256 with 120k iterations)
 * 3. Auth Helpers & Session State Persistence
 * 4. Automatic 401 Token Refresh Interceptor Simulation
 * 5. Client API Services & Error Parsing Resilience
 */

class LocalStorageMock {
    constructor() {
        this.store = new Map();
    }

    getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
    }

    setItem(key, value) {
        this.store.set(key, String(value));
    }

    removeItem(key) {
        this.store.delete(key);
    }

    clear() {
        this.store.clear();
    }
}

globalThis.localStorage = new LocalStorageMock();

const {
    storage,
    conversationStorage,
    userContextStorage,
    moodStorage,
    journalStorage,
    exerciseStorage,
} = await import('../src/utils/storage.js');

const {
    saveUser,
    getUser,
    logout,
    hashPassword,
    verifyPassword,
} = await import('../src/services/auth.js');

async function runClientTests() {
    console.log('====================================================');
    console.log('       💻 MINDWELL CLIENT-TIER TEST SUITE            ');
    console.log('====================================================\n');

    let passed = 0;
    const t0 = Date.now();

    // =========================================================================
    // SECTION 1: GENERIC STORAGE ADAPTER & CORRUPTED DATA RESILIENCE
    // =========================================================================
    console.log('▶ [1/5] Testing Storage Adapter & Corruption Resilience...');

    // Test 1.1: Storage round-trip with complex nested object
    {
        const payload = {
            id: 'sess_123',
            metrics: { score: 95.5, flags: [true, false, null] },
            label: 'Multimodal session',
        };
        const setOk = storage.set('test_key', payload);
        assert.equal(setOk, true);

        const fetched = storage.get('test_key');
        assert.deepEqual(fetched, payload);

        const removeOk = storage.remove('test_key');
        assert.equal(removeOk, true);
        assert.equal(storage.get('test_key'), null);

        passed += 1;
        console.log(`  PASS [${passed}]: Generic storage set/get/remove round-trip verified`);
    }

    // Test 1.2: Corrupted JSON in localStorage handled gracefully without throwing
    {
        globalThis.localStorage.setItem('corrupted_key', '{"unclosed_json: true');
        const result = storage.get('corrupted_key');
        assert.equal(result, null, 'Corrupted JSON must return null gracefully');
        globalThis.localStorage.removeItem('corrupted_key');

        passed += 1;
        console.log(`  PASS [${passed}]: Corrupted localStorage data returns null without crashing`);
    }

    // =========================================================================
    // SECTION 2: SUB-STORAGE MODULES (Conversations, Context, Moods, Journals)
    // =========================================================================
    console.log('\n▶ [2/5] Testing Sub-Storage Modules & Analytics Tracking...');

    // Test 2.1: Conversation storage message appending
    {
        conversationStorage.clear();
        assert.deepEqual(conversationStorage.getAll(), []);

        conversationStorage.addMessage({ role: 'user', content: 'Hello MindWell' });
        conversationStorage.addMessage({ role: 'assistant', content: 'Hello! How can I support you?' });

        const history = conversationStorage.getAll();
        assert.equal(history.length, 2);
        assert.equal(history[0].role, 'user');
        assert.ok(history[0].timestamp);
        assert.ok(history[0].id);

        conversationStorage.clear();
        assert.equal(conversationStorage.getAll().length, 0);

        passed += 1;
        console.log(`  PASS [${passed}]: ConversationStorage appends messages with auto-generated IDs & timestamps`);
    }

    // Test 2.2: UserContext storage and insight buffer capping (max 50)
    {
        storage.remove('mindwell_user_context');
        const initial = userContextStorage.get();
        assert.equal(initial.sessionCount, 0);
        assert.deepEqual(initial.insights, []);

        userContextStorage.update({ preferredTherapyStyles: ['cbt', 'mindfulness'] });
        userContextStorage.incrementSession();

        // Push 60 insights to test 50-item cap
        for (let i = 1; i <= 60; i++) {
            userContextStorage.addInsight(`Insight #${i}`);
        }

        const updated = userContextStorage.get();
        assert.equal(updated.sessionCount, 1);
        assert.deepEqual(updated.preferredTherapyStyles, ['cbt', 'mindfulness']);
        assert.equal(updated.insights.length, 50, 'Insights buffer must be capped at 50 items');
        assert.equal(updated.insights[49].text, 'Insight #60');

        passed += 1;
        console.log(`  PASS [${passed}]: UserContextStorage tracks sessions and caps insight buffer at 50 items`);
    }

    // Test 2.3: MoodStorage addition and date range filtering
    {
        storage.remove('mindwell_moods');
        moodStorage.add({ mood: 4, emoji: '😊' });
        assert.equal(moodStorage.getAll().length, 1);

        const now = new Date();
        const past10Days = new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000);
        const past40Days = new Date(now.getTime() - 40 * 24 * 60 * 60 * 1000);

        // Pre-populate with historical dates to test date range filter
        storage.set('mindwell_moods', [
            { id: 1, mood: 4, emoji: '😊', timestamp: now.toISOString() },
            { id: 2, mood: 2, emoji: '😔', timestamp: past10Days.toISOString() },
            { id: 3, mood: 1, emoji: '😭', timestamp: past40Days.toISOString() },
        ]);

        const last30Days = moodStorage.getLast30Days();
        assert.equal(last30Days.length, 2, 'Last 30 days must only include items from past 30 days');

        passed += 1;
        console.log(`  PASS [${passed}]: MoodStorage queries and filters by date range accurately`);
    }

    // Test 2.4: JournalStorage CRUD and keyword search
    {
        storage.remove('mindwell_journals');
        storage.set('mindwell_journals', [
            { id: 101, title: 'Morning Walk', content: 'Saw sunrise and practiced breathing', moodTag: 'peaceful' },
            { id: 102, title: 'Work Stress', content: 'Deadlines approaching rapidly', moodTag: 'anxious' },
        ]);

        const all = journalStorage.getAll();
        assert.equal(all.length, 2);

        // Search by keyword
        const searchSunrise = journalStorage.search('sunrise');
        assert.equal(searchSunrise.length, 1);
        assert.equal(searchSunrise[0].title, 'Morning Walk');

        // Update
        journalStorage.update(101, { title: 'Morning Walk in Park' });
        const updated = journalStorage.getAll().find((j) => j.id === 101);
        assert.equal(updated.title, 'Morning Walk in Park');

        // Delete 101 -> 102 remains
        journalStorage.delete(101);
        const remaining = journalStorage.getAll();
        assert.equal(remaining.length, 1);
        assert.equal(remaining[0].id, 102);

        passed += 1;
        console.log(`  PASS [${passed}]: JournalStorage CRUD, updates and full-text keyword search verified`);
    }

    // Test 2.5: Exercise streak calculation
    {
        storage.remove('mindwell_exercises');
        const today = new Date();
        const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
        const twoDaysAgo = new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000);

        storage.set('mindwell_exercises', [
            { id: 1, name: 'Box Breathing', completedAt: twoDaysAgo.toISOString() },
            { id: 2, name: 'Body Scan', completedAt: yesterday.toISOString() },
            { id: 3, name: 'Grounding 5-4-3-2-1', completedAt: today.toISOString() },
        ]);

        const streak = exerciseStorage.getStreak();
        assert.equal(streak, 3, 'Consecutive 3 days must produce a streak of 3');

        passed += 1;
        console.log(`  PASS [${passed}]: ExerciseStorage calculates consecutive daily streaks accurately`);
    }

    // =========================================================================
    // SECTION 3: CLIENT PASSWORD HASHING (PBKDF2 SHA-256) & AUTH HELPERS
    // =========================================================================
    console.log('\n▶ [3/5] Testing Client Cryptography & Password Hashing...');

    // Test 3.1: Password hashing produces valid PBKDF2 structure
    {
        const rawPassword = 'ClientSecretPass123!_🔒';
        const record = await hashPassword(rawPassword);

        assert.equal(record.version, 2);
        assert.equal(record.algorithm, 'PBKDF2');
        assert.equal(record.hash, 'SHA-256');
        assert.equal(record.iterations, 120000);
        assert.ok(record.salt && typeof record.salt === 'string');
        assert.ok(record.passwordHash && typeof record.passwordHash === 'string');

        // Verification success
        const isValid = await verifyPassword(rawPassword, record);
        assert.equal(isValid, true, 'Correct password must verify successfully');

        // Verification failure on wrong password
        const isInvalid = await verifyPassword('WrongPassword999!', record);
        assert.equal(isInvalid, false, 'Incorrect password must be rejected');

        // Malformed record handling
        assert.equal(await verifyPassword(rawPassword, null), false);
        assert.equal(await verifyPassword(rawPassword, {}), false);

        passed += 1;
        console.log(`  PASS [${passed}]: Client PBKDF2 password hashing & verification verified with 120k iterations`);
    }

    // Test 3.2: User session lifecycle helpers
    {
        const user = { id: 'usr-456', name: 'Taylor', email: 'taylor@mindwell.local', role: 'user' };
        saveUser(user);
        assert.deepEqual(getUser(), user);

        logout();
        assert.equal(getUser(), null);

        passed += 1;
        console.log(`  PASS [${passed}]: User session lifecycle helpers (saveUser, getUser, logout) verified`);
    }

    // =========================================================================
    // SECTION 4: TOKEN REFRESH INTERCEPTOR SIMULATION
    // =========================================================================
    console.log('\n▶ [4/5] Testing Automatic 401 Token Refresh Interceptor...');

    // Test 4.1: Simulated API client with automatic 401 retry interceptor
    {
        let accessToken = 'initial-stale-access-token';
        let refreshCalled = false;
        let requestAttempts = 0;

        // Simulated backend endpoint
        async function mockFetch(url, options = {}) {
            requestAttempts += 1;
            const authHeader = options.headers?.Authorization;

            if (url === '/api/auth/refresh') {
                refreshCalled = true;
                accessToken = 'new-refreshed-access-token-v2';
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ accessToken, user: { id: 'usr-1' } }),
                };
            }

            // Protected route
            if (authHeader === 'Bearer new-refreshed-access-token-v2') {
                return {
                    ok: true,
                    status: 200,
                    json: async () => ({ message: 'Protected response received successfully' }),
                };
            }

            // Stale token returns 401
            return {
                ok: false,
                status: 401,
                json: async () => ({ error: 'Token expired' }),
            };
        }

        // Interceptor wrapper
        async function authenticatedRequest(url, options = {}) {
            const headers = { ...options.headers, Authorization: `Bearer ${accessToken}` };
            let response = await mockFetch(url, { ...options, headers });

            if (response.status === 401) {
                // Intercept 401 and refresh
                const refreshRes = await mockFetch('/api/auth/refresh', { method: 'POST' });
                if (!refreshRes.ok) {
                    throw new Error('Session expired, please login again');
                }
                const refreshData = await refreshRes.json();
                accessToken = refreshData.accessToken;

                // Retry original request with new token
                const retryHeaders = { ...options.headers, Authorization: `Bearer ${accessToken}` };
                response = await mockFetch(url, { ...options, headers: retryHeaders });
            }

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            return await response.json();
        }

        const data = await authenticatedRequest('/api/chat', { method: 'POST' });
        assert.equal(data.message, 'Protected response received successfully');
        assert.equal(refreshCalled, true);
        assert.equal(requestAttempts, 3); // 1st try (401) + refresh + 2nd try (200)
        assert.equal(accessToken, 'new-refreshed-access-token-v2');

        passed += 1;
        console.log(`  PASS [${passed}]: Automatic 401 interceptor refreshes token and replays original request`);
    }

    // =========================================================================
    // SECTION 5: CLIENT API SERVICE ERROR PARSING RESILIENCE
    // =========================================================================
    console.log('\n▶ [5/5] Testing Client API Service Error Parsing Resilience...');

    // Test 5.1: Error response parser handling various payloads
    {
        async function parseErrorResponse(response, fallbackMessage) {
            try {
                const payload = await response.json();
                return payload?.error || payload?.message || fallbackMessage;
            } catch {
                return fallbackMessage;
            }
        }

        // Error payload with .error
        const res1 = { json: async () => ({ error: 'Invalid credentials provided' }) };
        assert.equal(await parseErrorResponse(res1, 'Default error'), 'Invalid credentials provided');

        // Error payload with .message
        const res2 = { json: async () => ({ message: 'Rate limit exceeded' }) };
        assert.equal(await parseErrorResponse(res2, 'Default error'), 'Rate limit exceeded');

        // Non-JSON or broken payload
        const res3 = { json: async () => { throw new Error('Invalid JSON'); } };
        assert.equal(await parseErrorResponse(res3, 'Default error'), 'Default error');

        passed += 1;
        console.log(`  PASS [${passed}]: parseErrorResponse safely extracts error strings with fallbacks`);
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
    console.log('\n====================================================');
    console.log(`🎉 ALL ${passed} CLIENT-TIER TESTS PASSED in ${elapsed}s!`);
    console.log('====================================================\n');
}

runClientTests().catch((err) => {
    console.error('❌ Client tests failed:', err);
    process.exit(1);
});
