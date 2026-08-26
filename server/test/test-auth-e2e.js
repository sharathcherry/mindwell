import assert from 'node:assert/strict';
import { once } from 'node:events';
import { startServer } from '../index.js';
import { prisma } from '../db.js';
import { generateAccessToken, generateRefreshToken } from '../middleware/auth.js';

async function runAuthE2ETests() {
    console.log('====================================================');
    console.log('       🔐 MINDWELL E2E AUTH & PERMISSION TESTS       ');
    console.log('====================================================\n');

    const server = startServer(0);
    await once(server, 'listening');
    const address = server.address();
    const port = typeof address === 'object' && address ? address.port : 3001;
    const baseUrl = `http://127.0.0.1:${port}`;

    let passed = 0;
    const t0 = Date.now();

    try {
        const testEmail = `e2e-auth-${Date.now()}@mindwell.test`;
        const testPassword = 'Password123!';
        let accessToken = '';
        let refreshTokenCookie = '';
        let createdUserId = '';

        // Test 1: User Signup
        {
            const res = await fetch(`${baseUrl}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: testEmail,
                    password: testPassword,
                    name: 'Test Auth Engineer',
                    timezone: 'UTC',
                    locale: 'en-US',
                }),
            });

            assert.equal(res.status, 201, 'Signup should return 201');
            const data = await res.json();
            assert.ok(data.accessToken, 'Should return accessToken');
            assert.equal(data.user.email, testEmail);
            assert.equal(data.user.name, 'Test Auth Engineer');
            assert.ok(data.user.id);
            createdUserId = data.user.id;
            accessToken = data.accessToken;

            const cookieHeader = res.headers.get('set-cookie');
            assert.ok(cookieHeader && cookieHeader.includes('refreshToken='), 'Should set httpOnly refreshToken cookie');
            refreshTokenCookie = cookieHeader.split(';')[0];

            passed += 1;
            console.log(`  PASS [${passed}]: User signup succeeded with valid accessToken and cookie`);
        }

        // Test 2: Duplicate Signup Rejection
        {
            const res = await fetch(`${baseUrl}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: testEmail,
                    password: testPassword,
                }),
            });
            assert.equal(res.status, 400, 'Duplicate signup must return 400');
            const data = await res.json();
            assert.ok(data.error.includes('already exists'));

            passed += 1;
            console.log(`  PASS [${passed}]: Duplicate email signup properly rejected with 400`);
        }

        // Test 3: Get Authenticated Profile /me
        {
            const res = await fetch(`${baseUrl}/api/auth/me`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            assert.equal(res.status, 200);
            const data = await res.json();
            assert.equal(data.user.id, createdUserId);
            assert.equal(data.user.email, testEmail);

            passed += 1;
            console.log(`  PASS [${passed}]: GET /api/auth/me returns authenticated user details`);
        }

        // Test 4: User Login
        {
            const res = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: testEmail,
                    password: testPassword,
                }),
            });
            assert.equal(res.status, 200);
            const data = await res.json();
            assert.ok(data.accessToken);
            accessToken = data.accessToken;

            const cookieHeader = res.headers.get('set-cookie');
            assert.ok(cookieHeader && cookieHeader.includes('refreshToken='));
            refreshTokenCookie = cookieHeader.split(';')[0];

            passed += 1;
            console.log(`  PASS [${passed}]: User login succeeded and issued fresh tokens`);
        }

        // Test 5: Invalid Password Rejection
        {
            const res = await fetch(`${baseUrl}/api/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: testEmail,
                    password: 'WrongPassword999!',
                }),
            });
            assert.equal(res.status, 401);

            passed += 1;
            console.log(`  PASS [${passed}]: Invalid password rejected with 401 Unauthorized`);
        }

        // Test 6: Refresh Token Rotation
        let nextRefreshTokenCookie = '';
        {
            const res = await fetch(`${baseUrl}/api/auth/refresh`, {
                method: 'POST',
                headers: { Cookie: refreshTokenCookie },
            });
            assert.equal(res.status, 200);
            const data = await res.json();
            assert.ok(data.accessToken);
            accessToken = data.accessToken;

            const cookieHeader = res.headers.get('set-cookie');
            assert.ok(cookieHeader && cookieHeader.includes('refreshToken='));
            nextRefreshTokenCookie = cookieHeader.split(';')[0];

            passed += 1;
            console.log(`  PASS [${passed}]: Refresh token rotation issued new access token and rotated cookie`);
        }

        // Test 7: Replay Attack Invalidation (Replaying old refresh token must fail)
        {
            const res = await fetch(`${baseUrl}/api/auth/refresh`, {
                method: 'POST',
                headers: { Cookie: refreshTokenCookie },
            });
            assert.equal(res.status, 401, 'Replaying revoked token must return 401');

            passed += 1;
            console.log(`  PASS [${passed}]: Replay attack prevention verified; revoked refresh token rejected`);
        }

        // Test 8: Resource CRUD (Moods)
        let moodId = '';
        {
            // Unauthenticated 401
            const unauth = await fetch(`${baseUrl}/api/moods`);
            assert.equal(unauth.status, 401);

            // Create mood
            const createRes = await fetch(`${baseUrl}/api/moods`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    mood: 4,
                    emoji: '🙂',
                    label: 'Good',
                    notes: 'Feeling productive and calm.',
                }),
            });
            assert.equal(createRes.status, 201);
            const createData = await createRes.json();
            assert.ok(createData.mood.id);
            moodId = createData.mood.id;

            // List moods
            const listRes = await fetch(`${baseUrl}/api/moods`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            assert.equal(listRes.status, 200);
            const listData = await listRes.json();
            assert.ok(listData.moods.some(m => m.id === moodId));

            // Delete mood
            const delRes = await fetch(`${baseUrl}/api/moods/${moodId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            assert.equal(delRes.status, 200);

            passed += 1;
            console.log(`  PASS [${passed}]: /api/moods CRUD operations protected and functioning properly`);
        }

        // Test 9: Resource CRUD (Journals)
        let journalId = '';
        {
            // Create journal
            const createRes = await fetch(`${baseUrl}/api/journals`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    title: 'Milestone 2 Reflection',
                    prompt: 'What was achieved?',
                    content: 'Built robust server auth and full client integration.',
                    moodTag: 'accomplished',
                }),
            });
            assert.equal(createRes.status, 201);
            const createData = await createRes.json();
            journalId = createData.journal.id;

            // Update journal
            const updateRes = await fetch(`${baseUrl}/api/journals/${journalId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    title: 'Milestone 2 Reflection - Finalized',
                }),
            });
            assert.equal(updateRes.status, 200);
            const updateData = await updateRes.json();
            assert.equal(updateData.journal.title, 'Milestone 2 Reflection - Finalized');

            // Search journals
            const searchRes = await fetch(`${baseUrl}/api/journals?q=Finalized`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            assert.equal(searchRes.status, 200);
            const searchData = await searchRes.json();
            assert.equal(searchData.journals.length, 1);

            // Delete journal
            const delRes = await fetch(`${baseUrl}/api/journals/${journalId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            assert.equal(delRes.status, 200);

            passed += 1;
            console.log(`  PASS [${passed}]: /api/journals CRUD operations, update & search verified`);
        }

        // Test 10: Resource CRUD (Conversations)
        let convId = '';
        {
            const createRes = await fetch(`${baseUrl}/api/conversations`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    title: 'Therapy Chat Session #1',
                    messages: [
                        { role: 'user', content: 'I want to talk about my day.' },
                    ],
                }),
            });
            assert.equal(createRes.status, 201);
            const createData = await createRes.json();
            convId = createData.conversation.id;

            // Add message
            const msgRes = await fetch(`${baseUrl}/api/conversations/${convId}/messages`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    role: 'assistant',
                    content: 'I am here to listen and help you process.',
                }),
            });
            assert.equal(msgRes.status, 201);

            // Get conversation messages
            const getRes = await fetch(`${baseUrl}/api/conversations/${convId}/messages`, {
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            assert.equal(getRes.status, 200);
            const getData = await getRes.json();
            assert.equal(getData.messages.length, 2);

            // Delete conversation
            const delRes = await fetch(`${baseUrl}/api/conversations/${convId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${accessToken}` },
            });
            assert.equal(delRes.status, 200);

            passed += 1;
            console.log(`  PASS [${passed}]: /api/conversations CRUD and message appending verified`);
        }

        // Test 11: User Logout
        {
            const res = await fetch(`${baseUrl}/api/auth/logout`, {
                method: 'POST',
                headers: { Cookie: nextRefreshTokenCookie },
            });
            assert.equal(res.status, 200);

            // Further refresh attempts must fail
            const refreshAfterLogout = await fetch(`${baseUrl}/api/auth/refresh`, {
                method: 'POST',
                headers: { Cookie: nextRefreshTokenCookie },
            });
            assert.equal(refreshAfterLogout.status, 401);

            passed += 1;
            console.log(`  PASS [${passed}]: User logout revoked session and cleared cookies`);
        }

        // Cleanup DB user
        if (createdUserId) {
            await prisma.user.delete({ where: { id: createdUserId } }).catch(() => {});
        }

        const elapsed = ((Date.now() - t0) / 1000).toFixed(2);
        console.log('\n====================================================');
        console.log(`🎉 ALL ${passed} E2E AUTH & PERMISSION TESTS PASSED in ${elapsed}s!`);
        console.log('====================================================\n');
    } finally {
        await new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
        await prisma.$disconnect();
    }
}

runAuthE2ETests().catch((err) => {
    console.error('❌ E2E Auth tests failed:', err);
    process.exit(1);
});
