import assert from 'node:assert/strict';
import bcrypt from 'bcryptjs';
import { prisma, checkDbHealth } from '../db.js';

async function runDbTests() {
    console.log('🧪 Starting Database Layer & Schema Tests...\n');
    let passed = 0;

    // Test 1: DB Health Check
    {
        const health = await checkDbHealth();
        assert.equal(health.status, 'healthy');
        assert.ok(health.engine === 'sqlite' || health.engine === 'postgresql');
        passed += 1;
        console.log(`PASS [${passed}]: Database health check returned ${health.status} (${health.engine})`);
    }

    // Test 2: Query Seeded Demo User
    let demoUser;
    {
        demoUser = await prisma.user.findUnique({
            where: { email: 'demo@mindwell.local' },
            include: {
                sessions: true,
                conversations: {
                    include: { messages: true },
                },
                moodLogs: true,
                journalEntries: true,
            },
        });

        assert.ok(demoUser, 'Demo user must exist');
        assert.equal(demoUser.email, 'demo@mindwell.local');
        assert.equal(demoUser.role, 'user');

        const isPasswordValid = await bcrypt.compare('Password123!', demoUser.passwordHash);
        assert.equal(isPasswordValid, true, 'Demo password hash must match Password123!');

        assert.ok(demoUser.conversations.length >= 1, 'Demo user must have at least 1 conversation');
        assert.ok(demoUser.conversations[0].messages.length >= 2, 'Conversation must have messages');
        assert.ok(demoUser.moodLogs.length >= 2, 'Demo user must have seeded mood logs');
        assert.ok(demoUser.journalEntries.length >= 2, 'Demo user must have seeded journal entries');

        // Check acoustic telemetry and fusion parsing
        const userMsg = demoUser.conversations[0].messages.find((m) => m.role === 'user');
        assert.ok(userMsg);
        assert.equal(userMsg.detectedEmotion, 'sadness');
        assert.ok(userMsg.emotionConfidence > 0.8);
        const telemetry = JSON.parse(userMsg.acousticTelemetry);
        assert.ok(telemetry.pitch_f0_hz > 0);
        const fusion = JSON.parse(userMsg.fusion);
        assert.equal(fusion.isMaskedDistress, true);

        passed += 1;
        console.log(`PASS [${passed}]: Seeded demo user, relations, and multimodal telemetry verified`);
    }

    // Test 3: Session Lifecycle & Relations
    let testUserId;
    {
        const testUser = await prisma.user.create({
            data: {
                email: `test-${Date.now()}@mindwell.local`,
                passwordHash: await bcrypt.hash('TestPass123!', 10),
                name: 'Test Database User',
                role: 'user',
            },
        });
        testUserId = testUser.id;

        const session = await prisma.session.create({
            data: {
                userId: testUserId,
                tokenHash: `token-hash-${Date.now()}`,
                deviceFingerprint: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });

        assert.ok(session.id);
        assert.equal(session.userId, testUserId);

        const fetchedSession = await prisma.session.findUnique({
            where: { tokenHash: session.tokenHash },
            include: { user: true },
        });
        assert.equal(fetchedSession.user.id, testUserId);

        passed += 1;
        console.log(`PASS [${passed}]: Session creation and user relation lookup verified`);
    }

    // Test 4: CRUD & Cascade Deletions
    {
        // Add conversation, mood, journal to testUser
        const conv = await prisma.conversation.create({
            data: {
                userId: testUserId,
                title: 'Ephemeral Test Session',
                messages: {
                    create: [
                        { role: 'user', content: 'Testing cascading deletes' },
                        { role: 'assistant', content: 'Understood' },
                    ],
                },
            },
        });

        const mood = await prisma.moodLog.create({
            data: {
                userId: testUserId,
                mood: 5,
                emoji: '😄',
                tags: 'test,ecstatic',
                notes: 'All tests green',
            },
        });

        const journal = await prisma.journalEntry.create({
            data: {
                userId: testUserId,
                title: 'Test Journal',
                content: 'Ephemeral entry content',
            },
        });

        // Verify records exist
        const convCountBefore = await prisma.conversation.count({ where: { userId: testUserId } });
        const msgCountBefore = await prisma.chatMessage.count({ where: { conversationId: conv.id } });
        const moodCountBefore = await prisma.moodLog.count({ where: { userId: testUserId } });
        const journalCountBefore = await prisma.journalEntry.count({ where: { userId: testUserId } });
        assert.equal(convCountBefore, 1);
        assert.equal(msgCountBefore, 2);
        assert.equal(moodCountBefore, 1);
        assert.equal(journalCountBefore, 1);

        // Delete user -> should cascade delete sessions, conversations, chat messages, moods, journals
        await prisma.user.delete({
            where: { id: testUserId },
        });

        const userAfter = await prisma.user.findUnique({ where: { id: testUserId } });
        const sessionsAfter = await prisma.session.findMany({ where: { userId: testUserId } });
        const convsAfter = await prisma.conversation.findMany({ where: { userId: testUserId } });
        const msgsAfter = await prisma.chatMessage.findMany({ where: { conversationId: conv.id } });
        const moodsAfter = await prisma.moodLog.findMany({ where: { userId: testUserId } });
        const journalsAfter = await prisma.journalEntry.findMany({ where: { userId: testUserId } });

        assert.equal(userAfter, null);
        assert.equal(sessionsAfter.length, 0);
        assert.equal(convsAfter.length, 0);
        assert.equal(msgsAfter.length, 0);
        assert.equal(moodsAfter.length, 0);
        assert.equal(journalsAfter.length, 0);

        passed += 1;
        console.log(`PASS [${passed}]: Full cascade deletion verified across all 6 models`);
    }

    console.log(`\n🎉 All Database Layer tests passed successfully (${passed}/${passed})!\n`);
}

runDbTests()
    .catch((err) => {
        console.error('❌ Database tests failed:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
