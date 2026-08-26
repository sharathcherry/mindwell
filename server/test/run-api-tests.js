import assert from 'node:assert/strict';
import { once } from 'node:events';
import bcrypt from 'bcryptjs';
import { prisma, checkDbHealth } from '../db.js';
import { startServer } from '../index.js';
import { fuseMultimodalEmotion, analyzeMessage, extractTherapyInsights } from '../services/analysis.js';
import { resolveCrisisRegion, buildCrisisResponse } from '../services/crisis.js';
import { chatWithAI, generateTherapyReport, generateLifestyleReport } from '../services/nvidia.js';
import { generateAccessToken, generateRefreshToken, hashToken } from '../middleware/auth.js';

/**
 * MindWell Comprehensive Server API, Multimodal Fusion, Crisis Triage, Database & Auth Test Suite
 * Covers:
 * 1. Deterministic Crisis Triage Engine (<50ms keyword matching & regional hotlines)
 * 2. Two-Tier Semantic-Acoustic Multimodal Fusion (Masked distress, congruence, sarcasm)
 * 3. Database Layer CRUD & Acoustic Telemetry Persistence (User, Session, Conversation, Message, MoodLog, JournalEntry)
 * 4. Auth & Token Rotation Lifecycle Contract Simulation & Live HTTP Auth Endpoints
 * 5. Live HTTP Server Integration (Health, Protected Resource CRUD, Chat, Reports)
 */

async function runAllApiTests() {
    console.log('====================================================');
    console.log('       🧠 MINDWELL TIER-2 API & MULTIMODAL TESTS     ');
    console.log('====================================================\n');

    process.env.GROQ_API_KEY = '';
    process.env.NVIDIA_API_KEY = '';
    process.env.GEMINI_API_KEY = '';

    let passed = 0;
    const t0 = Date.now();

    // =========================================================================
    // SECTION 1: DETERMINISTIC CRISIS TRIAGE ENGINE (<50ms)
    // =========================================================================
    console.log('▶ [1/5] Testing Deterministic Crisis Triage Engine & Sub-50ms Hotlines...');

    // Test 1.1: Sub-50ms Crisis Keyword Matching Benchmark
    {
        const crisisPhrases = [
            'I want to commit suicide',
            'I am going to kill myself tonight',
            'I feel like I want to end my life',
            "I simply don't want to live anymore",
            'Thinking about self harm again',
            'I might hurt myself today',
        ];

        const benchStart = performance.now();
        for (const phrase of crisisPhrases) {
            const analysis = analyzeMessage(phrase);
            assert.equal(analysis.hasCrisisIndicator, true, `Phrase "${phrase}" must trigger crisis indicator`);
        }
        const benchDuration = performance.now() - benchStart;

        assert.ok(benchDuration < 50, `Crisis keyword evaluation must complete in < 50ms (actual: ${benchDuration.toFixed(2)}ms)`);
        passed += 1;
        console.log(`  PASS [${passed}]: Crisis keyword detection benchmarked in ${benchDuration.toFixed(2)}ms (<50ms target)`);
    }

    // Test 1.2: Multi-Country Regional Hotline Routing (US, GB, IN, CA, AU, DEFAULT)
    {
        const testRegions = [
            { ctx: { countryCode: 'US' }, expectedRegion: 'US', emergency: '911', check: '988' },
            { ctx: { locale: 'en-GB' }, expectedRegion: 'GB', emergency: '999', check: 'Samaritans' },
            { ctx: { timezone: 'Asia/Kolkata' }, expectedRegion: 'IN', emergency: '112', check: 'Kiran' },
            { ctx: { countryCode: 'CA' }, expectedRegion: 'CA', emergency: '911', check: 'Crisis Services Canada' },
            { ctx: { timezone: 'Australia/Sydney' }, expectedRegion: 'AU', emergency: '000', check: 'Lifeline' },
            { ctx: { locale: 'fr-FR' }, expectedRegion: 'DEFAULT', emergency: '112', check: 'Befrienders' },
        ];

        for (const tr of testRegions) {
            const region = resolveCrisisRegion(tr.ctx);
            assert.equal(region, tr.expectedRegion, `Region for context ${JSON.stringify(tr.ctx)} must resolve to ${tr.expectedRegion}`);

            const response = buildCrisisResponse(tr.ctx, { riskLevel: 'imminent', reasons: ['keyword_match'] });
            assert.ok(response.message.includes(tr.emergency), `Crisis response must include emergency number ${tr.emergency}`);
            assert.ok(response.message.includes(tr.check), `Crisis response must include hotline ${tr.check}`);
            assert.ok(response.crisis.grounding.steps.length >= 4, 'Must include CBT grounding steps');
        }
        passed += 1;
        console.log(`  PASS [${passed}]: Multi-country hotline directory routing verified across US, GB, IN, CA, AU, DEFAULT`);
    }

    // Test 1.3: CBT 5-4-3-2-1 Grounding Protocol Structure
    {
        const response = buildCrisisResponse({ countryCode: 'US' }, { riskLevel: 'high' });
        assert.ok(response.crisis);
        assert.equal(response.crisis.grounding.approach, 'cbt-5-4-3-2-1-plus-breathing');
        assert.ok(response.message.includes('5 things you can see'));
        assert.ok(response.message.includes('4 seconds'));
        passed += 1;
        console.log(`  PASS [${passed}]: CBT 5-4-3-2-1 grounding protocol included in all crisis responses`);
    }

    // =========================================================================
    // SECTION 2: MULTIMODAL EMOTION FUSION ENGINE
    // =========================================================================
    console.log('\n▶ [2/5] Testing Two-Tier Multimodal Emotion Fusion Engine...');

    // Test 2.1: Masked Distress Detection (Spoken text positive, Voice acoustic negative)
    {
        const message = "I am totally fine and everything is completely okay!";
        const semantic = analyzeMessage(message);
        const userContext = {
            detectedVoiceEmotion: 'sadness',
            emotionConfidence: 0.86,
            allAcousticEmotions: { sadness: 0.86, neutral: 0.09, happiness: 0.05 },
            acousticBiomarkers: { pitch_f0_hz: 198.5, jitter_percent: 1.25, rms_energy: 0.22 },
        };
        const fusionResult = fuseMultimodalEmotion(semantic, userContext);
        assert.equal(fusionResult.fusion.isMaskedDistress, true);
        assert.equal(fusionResult.fusion.primaryEmotion, 'depression');
        assert.equal(fusionResult.fusion.mode, 'acoustic_dominant_masked_distress');
        assert.ok(fusionResult.fusion.confidence >= 0.85);
        passed += 1;
        console.log(`  PASS [${passed}]: Masked distress accurately classified when voice shows acute sadness`);
    }

    // Test 2.2: Emotional Congruence Verification (Text and Voice agree)
    {
        const message = "I am feeling so joyful, happy and excited today!";
        const semantic = analyzeMessage(message);
        const userContext = {
            detectedVoiceEmotion: 'happiness',
            emotionConfidence: 0.82,
            allAcousticEmotions: { happiness: 0.82, neutral: 0.12, sadness: 0.06 },
        };
        const fusionResult = fuseMultimodalEmotion(semantic, userContext);
        assert.equal(fusionResult.fusion.isCongruent, true);
        assert.equal(fusionResult.fusion.isMaskedDistress, false);
        assert.equal(fusionResult.fusion.primaryEmotion, 'positive');
        assert.equal(fusionResult.fusion.mode, 'multimodal_congruent');
        passed += 1;
        console.log(`  PASS [${passed}]: Emotional congruence verified when text and vocal acoustic signals agree`);
    }

    // Test 2.3: Sarcastic Strain & Affective Tension
    {
        const message = "Oh wonderful, this is just great.";
        const semantic = analyzeMessage(message);
        const userContext = {
            detectedVoiceEmotion: 'anger',
            emotionConfidence: 0.78,
            allAcousticEmotions: { anger: 0.78, sadness: 0.12, neutral: 0.10 },
        };
        const fusionResult = fuseMultimodalEmotion(semantic, userContext);
        assert.equal(fusionResult.fusion.isSarcasticStrain, true);
        assert.equal(fusionResult.fusion.primaryEmotion, 'anger');
        passed += 1;
        console.log(`  PASS [${passed}]: Sarcastic strain detected from conflicting positive text and angry vocal cue`);
    }

    // Test 2.4: Pure Semantic Fallback (No Voice Telemetry)
    {
        const message = "I feel so anxious and overwhelmed by everything.";
        const semantic = analyzeMessage(message);
        const fusionResult = fuseMultimodalEmotion(semantic, {});
        assert.equal(fusionResult.fusion.mode, 'semantic_only');
        assert.equal(fusionResult.fusion.primaryEmotion, 'anxiety');
        assert.equal(fusionResult.fusion.acousticTelemetry, null);
        passed += 1;
        console.log(`  PASS [${passed}]: Pure semantic fallback activates cleanly in absence of vocal telemetry`);
    }

    // =========================================================================
    // SECTION 3: DATABASE CRUD & MULTIMODAL TELEMETRY PERSISTENCE
    // =========================================================================
    console.log('\n▶ [3/5] Testing Database Layer CRUD & Multimodal Telemetry Persistence...');

    // Test 3.1: DB Health Check
    {
        const health = await checkDbHealth();
        assert.equal(health.status, 'healthy');
        assert.ok(health.engine === 'sqlite' || health.engine === 'postgresql');
        passed += 1;
        console.log(`  PASS [${passed}]: Prisma database connection health verified (${health.engine})`);
    }

    // Test 3.2: User Signup, Password Hashing & Refresh Session in DB
    let testUserId;
    let testSessionId;
    {
        const email = `api-test-${Date.now()}@mindwell.local`;
        const rawPassword = 'SecurePassword123!';
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        const user = await prisma.user.create({
            data: {
                email,
                passwordHash,
                name: 'API Test User',
                role: 'user',
                timezone: 'America/New_York',
                locale: 'en-US',
            },
        });
        testUserId = user.id;

        assert.ok(user.id);
        assert.equal(user.email, email);

        // Verify password hash
        const isMatch = await bcrypt.compare(rawPassword, user.passwordHash);
        assert.equal(isMatch, true);

        // Create Refresh Session
        const session = await prisma.session.create({
            data: {
                userId: user.id,
                tokenHash: `refresh-token-hash-${Date.now()}`,
                deviceFingerprint: 'Mozilla/5.0 Chrome/120.0',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        testSessionId = session.id;
        assert.ok(session.id);
        assert.equal(session.userId, testUserId);

        passed += 1;
        console.log(`  PASS [${passed}]: User creation, bcrypt hashing, and refresh token session persistence verified`);
    }

    // Test 3.3: Conversation & ChatMessage with Multimodal Acoustic Telemetry
    let conversationId;
    {
        const conversation = await prisma.conversation.create({
            data: {
                userId: testUserId,
                title: 'Acoustic SER Telemetry Session',
            },
        });
        conversationId = conversation.id;

        const telemetryPayload = {
            rms_energy: 0.2828,
            zero_crossing_rate: 0.0275,
            pitch_f0_hz: 222.22,
            jitter_percent: 1.1086,
            shimmer_percent: 0.0,
            speaking_rate: 0.67,
            arousal: 'high',
        };

        const fusionPayload = {
            primaryEmotion: 'depression',
            confidence: 0.94,
            isMaskedDistress: true,
            isCongruent: false,
        };

        const message = await prisma.chatMessage.create({
            data: {
                conversationId: conversation.id,
                role: 'user',
                content: 'I told everyone I was fine, but I feel empty.',
                detectedEmotion: 'sadness',
                emotionConfidence: 0.94,
                acousticTelemetry: JSON.stringify(telemetryPayload),
                fusion: JSON.stringify(fusionPayload),
            },
        });

        assert.ok(message.id);
        assert.equal(message.conversationId, conversationId);
        assert.equal(message.detectedEmotion, 'sadness');

        const parsedTelemetry = JSON.parse(message.acousticTelemetry);
        assert.equal(parsedTelemetry.pitch_f0_hz, 222.22);
        assert.equal(parsedTelemetry.arousal, 'high');

        passed += 1;
        console.log(`  PASS [${passed}]: Conversation & ChatMessage with full acoustic biomarkers & fusion stored in DB`);
    }

    // Test 3.4: MoodLog CRUD Persistence
    {
        const mood = await prisma.moodLog.create({
            data: {
                userId: testUserId,
                mood: 4,
                emoji: '🙂',
                tags: 'Good, Calm',
                notes: 'Morning walk was peaceful',
            },
        });
        assert.ok(mood.id);
        assert.equal(mood.mood, 4);

        const fetched = await prisma.moodLog.findMany({
            where: { userId: testUserId },
        });
        assert.equal(fetched.length, 1);
        assert.equal(fetched[0].emoji, '🙂');

        passed += 1;
        console.log(`  PASS [${passed}]: MoodLog CRUD operations persisted and queried successfully`);
    }

    // Test 3.5: JournalEntry CRUD Persistence
    {
        const journal = await prisma.journalEntry.create({
            data: {
                userId: testUserId,
                title: 'Evening Gratitude Reflection',
                prompt: 'What went well today?',
                content: 'Completed project milestone and took time for rest.',
                moodTag: 'peaceful',
            },
        });
        assert.ok(journal.id);

        const updated = await prisma.journalEntry.update({
            where: { id: journal.id },
            data: { content: 'Completed project milestone and celebrated with tea.' },
        });
        assert.ok(updated.content.includes('celebrated'));

        passed += 1;
        console.log(`  PASS [${passed}]: JournalEntry creation and updates persisted successfully`);
    }

    // Test 3.6: Cascade Deletion on User Deletion
    {
        await prisma.user.delete({ where: { id: testUserId } });

        const checkSessions = await prisma.session.findMany({ where: { userId: testUserId } });
        const checkConvs = await prisma.conversation.findMany({ where: { userId: testUserId } });
        const checkMoods = await prisma.moodLog.findMany({ where: { userId: testUserId } });
        const checkJournals = await prisma.journalEntry.findMany({ where: { userId: testUserId } });

        assert.equal(checkSessions.length, 0);
        assert.equal(checkConvs.length, 0);
        assert.equal(checkMoods.length, 0);
        assert.equal(checkJournals.length, 0);

        passed += 1;
        console.log(`  PASS [${passed}]: Cascade deletion verified across User relations`);
    }

    // =========================================================================
    // SECTION 4: AUTHENTICATION & REFRESH TOKEN ROTATION CONTRACTS
    // =========================================================================
    console.log('\n▶ [4/5] Testing Authentication & Token Lifecycle Contracts...');

    // Test 4.1: Refresh Token Rotation Lifecycle
    {
        let currentRefreshToken = `initial-refresh-token-${Date.now()}`;
        const sessionStore = new Map();

        // 1. Store initial session
        sessionStore.set(currentRefreshToken, { userId: 'usr-999', valid: true, expiresAt: Date.now() + 10000 });

        // 2. Rotate token
        function rotateToken(oldToken) {
            const session = sessionStore.get(oldToken);
            if (!session || !session.valid || session.expiresAt < Date.now()) {
                throw new Error('Invalid or expired refresh token');
            }
            // Revoke old token
            sessionStore.delete(oldToken);
            // Issue new token
            const newToken = `rotated-refresh-token-${Date.now()}`;
            sessionStore.set(newToken, { userId: session.userId, valid: true, expiresAt: Date.now() + 10000 });
            return {
                accessToken: `access-token-${Date.now()}`,
                refreshToken: newToken,
            };
        }

        const rotated = rotateToken(currentRefreshToken);
        assert.ok(rotated.accessToken);
        assert.ok(rotated.refreshToken !== currentRefreshToken);

        // 3. Old token must now be invalid (replay protection)
        assert.throws(() => rotateToken(currentRefreshToken), /Invalid or expired/);

        passed += 1;
        console.log(`  PASS [${passed}]: Refresh token rotation and replay-attack invalidation verified`);
    }

    // =========================================================================
    // SECTION 5: LIVE HTTP SERVER INTEGRATION (Auth, CRUD, Chat, Reports)
    // =========================================================================
    console.log('\n▶ [5/5] Testing Live HTTP Server Endpoints & Protected CRUD...');

    const server = startServer(0);
    await once(server, 'listening');
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3001;
    const baseUrl = `http://127.0.0.1:${port}`;

    try {
        // Test 5.1: Health check
        {
            const res = await fetch(`${baseUrl}/api/health`);
            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(data.status, 'ok');
            assert.equal(data.version, '1.0.0');
            passed += 1;
            console.log(`  PASS [${passed}]: GET /api/health returns HTTP 200 and operational status`);
        }

        // Test 5.2: Live User Signup & Cookie Check
        let liveUserToken;
        let liveRefreshTokenCookie;
        const testUserEmail = `live-auth-${Date.now()}@mindwell.local`;
        {
            const res = await fetch(`${baseUrl}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: testUserEmail,
                    password: 'SuperSecret123!',
                    name: 'Live Auth User',
                }),
            });
            assert.equal(res.status, 201);
            const data = await res.json();
            assert.ok(data.accessToken);
            assert.equal(data.user.email, testUserEmail);
            liveUserToken = data.accessToken;

            const cookieHeader = res.headers.get('set-cookie');
            assert.ok(cookieHeader && cookieHeader.includes('refreshToken='));
            liveRefreshTokenCookie = cookieHeader.split(';')[0];

            passed += 1;
            console.log(`  PASS [${passed}]: POST /api/auth/signup creates user, returns accessToken and sets httpOnly refreshToken cookie`);
        }

        // Test 5.3: Live User Profile GET /api/auth/me
        {
            const res = await fetch(`${baseUrl}/api/auth/me`, {
                headers: { Authorization: `Bearer ${liveUserToken}` },
            });
            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(data.user.email, testUserEmail);

            // Unauthenticated request returns 401
            const unauthRes = await fetch(`${baseUrl}/api/auth/me`);
            assert.equal(unauthRes.status, 401);

            passed += 1;
            console.log(`  PASS [${passed}]: GET /api/auth/me validates Bearer token and rejects unauthenticated request`);
        }

        // Test 5.4: Live Token Refresh & Rotation
        {
            const res = await fetch(`${baseUrl}/api/auth/refresh`, {
                method: 'POST',
                headers: { Cookie: liveRefreshTokenCookie },
            });
            assert.equal(res.status, 200);
            const data = await res.json();
            assert.ok(data.accessToken);
            liveUserToken = data.accessToken; // update with refreshed token

            // Replaying the old cookie must fail (Replay Protection)
            const replayRes = await fetch(`${baseUrl}/api/auth/refresh`, {
                method: 'POST',
                headers: { Cookie: liveRefreshTokenCookie },
            });
            assert.equal(replayRes.status, 401);

            passed += 1;
            console.log(`  PASS [${passed}]: POST /api/auth/refresh rotates token and prevents refresh replay attacks`);
        }

        // Test 5.5: Live Moods CRUD Route Protection & Operations
        let liveMoodId;
        {
            // 401 on unauthenticated
            const unauthRes = await fetch(`${baseUrl}/api/moods`);
            assert.equal(unauthRes.status, 401);

            // POST new mood
            const postRes = await fetch(`${baseUrl}/api/moods`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${liveUserToken}`,
                },
                body: JSON.stringify({
                    mood: 5,
                    emoji: '😄',
                    tags: 'Great',
                    notes: 'Fabulous energy today!',
                }),
            });
            assert.equal(postRes.status, 201);
            const postData = await postRes.json();
            assert.ok(postData.mood.id);
            liveMoodId = postData.mood.id;

            // GET moods
            const getRes = await fetch(`${baseUrl}/api/moods`, {
                headers: { Authorization: `Bearer ${liveUserToken}` },
            });
            assert.equal(getRes.status, 200);
            const getData = await getRes.json();
            assert.ok(Array.isArray(getData.moods));
            assert.equal(getData.moods[0].mood, 5);

            // DELETE mood
            const delRes = await fetch(`${baseUrl}/api/moods/${liveMoodId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${liveUserToken}` },
            });
            assert.equal(delRes.status, 200);

            passed += 1;
            console.log(`  PASS [${passed}]: /api/moods enforces requireAuth and supports full CRUD`);
        }

        // Test 5.6: Live Journals CRUD Route Protection & Operations
        let liveJournalId;
        {
            // 401 on unauthenticated
            const unauthRes = await fetch(`${baseUrl}/api/journals`);
            assert.equal(unauthRes.status, 401);

            // POST journal
            const postRes = await fetch(`${baseUrl}/api/journals`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${liveUserToken}`,
                },
                body: JSON.stringify({
                    title: 'Live Journal Test',
                    content: 'Testing REST persistence of journal reflections.',
                }),
            });
            assert.equal(postRes.status, 201);
            const postData = await postRes.json();
            liveJournalId = postData.journal.id;

            // PUT update journal
            const putRes = await fetch(`${baseUrl}/api/journals/${liveJournalId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${liveUserToken}`,
                },
                body: JSON.stringify({
                    title: 'Updated Live Journal Test',
                }),
            });
            assert.equal(putRes.status, 200);

            // DELETE journal
            const delRes = await fetch(`${baseUrl}/api/journals/${liveJournalId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${liveUserToken}` },
            });
            assert.equal(delRes.status, 200);

            passed += 1;
            console.log(`  PASS [${passed}]: /api/journals enforces requireAuth and supports full CRUD`);
        }

        // Test 5.7: Live Conversations CRUD Route Protection & Operations
        let liveConvId;
        {
            // 401 on unauthenticated
            const unauthRes = await fetch(`${baseUrl}/api/conversations`);
            assert.equal(unauthRes.status, 401);

            // POST conversation
            const postRes = await fetch(`${baseUrl}/api/conversations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${liveUserToken}`,
                },
                body: JSON.stringify({
                    title: 'Live Conversation Session',
                    messages: [
                        { role: 'user', content: 'Hello MindWell!' },
                        { role: 'assistant', content: 'Hello! How can I support you today?' },
                    ],
                }),
            });
            assert.equal(postRes.status, 201);
            const postData = await postRes.json();
            liveConvId = postData.conversation.id;

            // GET conversation messages
            const getRes = await fetch(`${baseUrl}/api/conversations/${liveConvId}/messages`, {
                headers: { Authorization: `Bearer ${liveUserToken}` },
            });
            assert.equal(getRes.status, 200);
            const getData = await getRes.json();
            assert.equal(getData.messages.length, 2);

            // DELETE conversation
            const delRes = await fetch(`${baseUrl}/api/conversations/${liveConvId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${liveUserToken}` },
            });
            assert.equal(delRes.status, 200);

            passed += 1;
            console.log(`  PASS [${passed}]: /api/conversations enforces requireAuth and supports full CRUD`);
        }

        // Test 5.8: Chat validation (empty body rejected)
        {
            const res = await fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: '   ' }),
            });
            assert.equal(res.status, 400);
            const data = await res.json();
            assert.equal(data.error, 'Message is required');
            passed += 1;
            console.log(`  PASS [${passed}]: POST /api/chat validates and rejects empty message`);
        }

        // Test 5.9: Chat with Multimodal Telemetry Payload
        {
            const res = await fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${liveUserToken}`,
                },
                body: JSON.stringify({
                    message: 'I am doing okay, just a normal day.',
                    conversationHistory: [],
                    userContext: {
                        detectedVoiceEmotion: 'sadness',
                        emotionConfidence: 0.88,
                        allAcousticEmotions: { sadness: 0.88, neutral: 0.08, happiness: 0.04 },
                        acousticBiomarkers: { pitch_f0_hz: 215.0, jitter_percent: 1.15 },
                    },
                }),
            });
            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(typeof data.message, 'string');
            assert.ok(data.fusion);
            assert.equal(data.fusion.isMaskedDistress, true);
            passed += 1;
            console.log(`  PASS [${passed}]: POST /api/chat processes multimodal acoustic telemetry & returns fusion metadata`);
        }

        // Test 5.10: Therapy Report Endpoint
        {
            const res = await fetch(`${baseUrl}/api/reports/therapy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userContext: {},
                    conversationHistory: [
                        { role: 'user', content: 'I feel stressed about work deadlines' },
                        { role: 'assistant', content: 'Let us explore CBT reframing techniques.' },
                    ],
                    moods: [{ mood: 2, timestamp: new Date().toISOString() }],
                }),
            });
            assert.equal(res.status, 200);
            const report = await res.json();
            assert.equal(typeof report.summary, 'string');
            assert.ok(Array.isArray(report.therapies));
            assert.ok(report.therapies.length >= 3);
            passed += 1;
            console.log(`  PASS [${passed}]: POST /api/reports/therapy generates structured clinical recommendations`);
        }

        // Test 5.11: Lifestyle Report Endpoint
        {
            const res = await fetch(`${baseUrl}/api/reports/lifestyle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userContext: {},
                    moods: [{ mood: 3 }, { mood: 5 }, { mood: 4 }],
                    journals: [{ title: 'Walk in the park', content: 'Felt calm and refreshed' }],
                }),
            });
            assert.equal(res.status, 200);
            const report = await res.json();
            assert.equal(typeof report.introduction, 'string');
            assert.ok(report.introduction.includes('4.0'));
            passed += 1;
            console.log(`  PASS [${passed}]: POST /api/reports/lifestyle calculates average mood and wellness overview`);
        }

        const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
        console.log('\n====================================================');
        console.log(`🎉 ALL ${passed} TIER-2 API & MULTIMODAL TESTS PASSED in ${elapsed}s!`);
        console.log('====================================================\n');
    } finally {
        await new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
        await prisma.$disconnect();
    }
}

runAllApiTests().catch((err) => {
    console.error('❌ API tests failed:', err);
    process.exit(1);
});
