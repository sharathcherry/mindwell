import bcrypt from 'bcryptjs';
import { prisma } from '../db.js';

async function main() {
    console.log('🌱 Starting MindWell database seed...');

    const demoEmail = 'demo@mindwell.local';
    const demoPassword = 'Password123!';
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(demoPassword, saltRounds);

    // Upsert demo user
    const user = await prisma.user.upsert({
        where: { email: demoEmail },
        update: {
            passwordHash,
            name: 'MindWell Demo User',
            role: 'user',
            timezone: 'America/New_York',
            locale: 'en-US',
        },
        create: {
            email: demoEmail,
            passwordHash,
            name: 'MindWell Demo User',
            role: 'user',
            timezone: 'America/New_York',
            locale: 'en-US',
        },
    });

    console.log(`👤 Demo user configured: ${user.email} (ID: ${user.id})`);

    // Clean existing seed data for demo user to ensure clean re-runs
    await prisma.chatMessage.deleteMany({
        where: { conversation: { userId: user.id } },
    });
    await prisma.conversation.deleteMany({
        where: { userId: user.id },
    });
    await prisma.moodLog.deleteMany({
        where: { userId: user.id },
    });
    await prisma.journalEntry.deleteMany({
        where: { userId: user.id },
    });

    // 1. Seed Conversation & Multimodal Chat Messages
    const conversation = await prisma.conversation.create({
        data: {
            userId: user.id,
            title: 'Welcome & Initial Reflection',
            messages: {
                create: [
                    {
                        role: 'user',
                        content: "Hello, I've been feeling a bit overwhelmed with work lately, but trying to stay positive.",
                        detectedEmotion: 'sadness',
                        emotionConfidence: 0.84,
                        acousticTelemetry: JSON.stringify({
                            pitch_f0_hz: 184.2,
                            jitter_percent: 1.12,
                            shimmer_percent: 4.31,
                            speaking_rate: 3.8,
                            rms_energy: 0.042,
                            zero_crossing_rate: 0.085,
                            all_emotions: { sadness: 0.84, neutral: 0.10, happiness: 0.06 },
                            tier: 'Tier-1 Local Acoustic SER (HuBERT)',
                        }),
                        fusion: JSON.stringify({
                            primaryEmotion: 'depression',
                            confidence: 0.85,
                            isMaskedDistress: true,
                            toneAttuned: true,
                        }),
                    },
                    {
                        role: 'assistant',
                        content:
                            "I hear you, and it is completely normal to feel overwhelmed during demanding seasons. Acknowledging that weight is a brave first step. Let's take a slow breath together. Would you like to explore what feels heaviest right now, or try a 2-minute grounding exercise?",
                    },
                ],
            },
        },
        include: {
            messages: true,
        },
    });

    console.log(`💬 Seeded conversation: "${conversation.title}" with ${conversation.messages.length} messages`);

    // 2. Seed Mood Logs
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const today = new Date();

    const mood1 = await prisma.moodLog.create({
        data: {
            userId: user.id,
            mood: 3,
            emoji: '😐',
            tags: 'work,busy,deadlines',
            notes: 'Busy workday with multiple meetings. Feeling stretched but coping.',
            timestamp: yesterday,
        },
    });

    const mood2 = await prisma.moodLog.create({
        data: {
            userId: user.id,
            mood: 4,
            emoji: '🙂',
            tags: 'evening walk,calm,mindful',
            notes: 'Took a refreshing 30-minute evening walk in the park. Feeling more grounded.',
            timestamp: today,
        },
    });

    console.log(`📊 Seeded 2 mood logs (Ratings: ${mood1.mood}/5, ${mood2.mood}/5)`);

    // 3. Seed Journal Entries
    const journal1 = await prisma.journalEntry.create({
        data: {
            userId: user.id,
            title: 'Finding Balance in Busy Weeks',
            prompt: 'What is one small boundary that protected your peace today?',
            content:
                'Today was packed with meetings, but stepping away from the screen for 15 minutes to drink tea in silence made a noticeable difference. Small intentional pauses matter.',
            moodTag: 'reflective',
        },
    });

    const journal2 = await prisma.journalEntry.create({
        data: {
            userId: user.id,
            title: 'Gratitude & Evening Reflections',
            prompt: 'List three things you appreciate about your day.',
            content:
                '1. Quiet morning tea before the workday started.\n2. A supportive message from a friend.\n3. The resilience to rest without feeling guilty.',
            moodTag: 'grateful',
        },
    });

    console.log(`📖 Seeded 2 journal entries ("${journal1.title}", "${journal2.title}")`);
    console.log('✅ MindWell database seeding completed successfully!\n');
}

main()
    .catch((e) => {
        console.error('❌ Error during database seeding:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
