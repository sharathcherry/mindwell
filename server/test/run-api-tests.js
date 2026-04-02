import assert from 'node:assert/strict';
import { once } from 'node:events';
import { startServer } from '../index.js';

async function run() {
    process.env.GROQ_API_KEY = '';
    process.env.NVIDIA_API_KEY = '';

    const server = startServer(0);
    await once(server, 'listening');
    const address = server.address();
    const baseUrl = `http://127.0.0.1:${address.port}`;
    let passed = 0;

    try {
        // Health
        {
            const response = await fetch(`${baseUrl}/api/health`);
            assert.equal(response.status, 200);
            const body = await response.json();
            assert.equal(body.status, 'ok');
            assert.equal(body.version, '1.0.0');
            passed += 1;
            console.log('PASS: GET /api/health');
        }

        // Chat validation
        {
            const response = await fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: '   ' }),
            });
            assert.equal(response.status, 400);
            const body = await response.json();
            assert.equal(body.error, 'Message is required');
            passed += 1;
            console.log('PASS: POST /api/chat validates empty input');
        }

        // Chat success
        {
            const response = await fetch(`${baseUrl}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: 'I feel overwhelmed with work this week.',
                    conversationHistory: [],
                    userContext: {},
                }),
            });
            assert.equal(response.status, 200);
            const body = await response.json();
            assert.equal(typeof body.message, 'string');
            assert.ok(body.message.length > 0);
            passed += 1;
            console.log('PASS: POST /api/chat returns response');
        }

        // Therapy report
        {
            const response = await fetch(`${baseUrl}/api/reports/therapy`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userContext: {},
                    conversationHistory: [],
                    moods: [],
                }),
            });
            assert.equal(response.status, 200);
            const body = await response.json();
            assert.equal(typeof body.summary, 'string');
            assert.ok(Array.isArray(body.therapies));
            passed += 1;
            console.log('PASS: POST /api/reports/therapy');
        }

        // Lifestyle report
        {
            const response = await fetch(`${baseUrl}/api/reports/lifestyle`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userContext: {},
                    moods: [],
                    journals: [],
                }),
            });
            assert.equal(response.status, 200);
            const body = await response.json();
            assert.equal(typeof body.introduction, 'string');
            passed += 1;
            console.log('PASS: POST /api/reports/lifestyle');
        }

        console.log(`\nAll API smoke tests passed (${passed}/5).`);
    } finally {
        await new Promise((resolve, reject) => {
            server.close((err) => (err ? reject(err) : resolve()));
        });
    }
}

run().catch((error) => {
    console.error('\nAPI smoke tests failed.');
    console.error(error);
    process.exit(1);
});
