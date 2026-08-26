import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function runCommand(command, args, cwd) {
    return new Promise((resolve, reject) => {
        const cmdString = `${command} ${args.join(' ')}`;
        console.log(`\n▶ Running: ${cmdString} (in ${path.relative(__dirname, cwd) || '.'})`);
        const proc = spawn(command, args, {
            cwd,
            stdio: 'inherit',
            shell: true,
        });

        proc.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command "${cmdString}" exited with code ${code}`));
            }
        });
    });
}

async function runAllSmokeTests() {
    console.log('====================================================');
    console.log('       🧠 MINDWELL UNIFIED 4-TIER TEST SUITE         ');
    console.log('====================================================');

    const t0 = Date.now();

    try {
        // 1. Python Tier-1 Acoustic SER & STT Endpoint Tests
        console.log('\n[1/6] Testing Tier-1 Acoustic SER Engine (PyTorch/CUDA + FastAPI)...');
        await runCommand('python', ['-u', 'test_audio_endpoint.py'], path.join(__dirname, 'python_audio'));

        // 2. Database Schema & Prisma Persistence Tests
        console.log('\n[2/6] Testing Database Layer & Prisma ORM Persistence...');
        await runCommand('node', ['test/test-db.js'], path.join(__dirname, 'server'));

        // 3. Server API, Multimodal Fusion & Deterministic Crisis Triage Tests
        console.log('\n[3/6] Testing Tier-2 Server API, Multimodal Fusion & Crisis Triage...');
        await runCommand('node', ['test/run-api-tests.js'], path.join(__dirname, 'server'));
        await runCommand('node', ['test/test-auth-e2e.js'], path.join(__dirname, 'server'));

        // 4. Client Storage, Auth, PBKDF2 Crypto & Interceptor Tests
        console.log('\n[4/6] Testing Client Storage, PBKDF2 Crypto & Auth Interceptors...');
        await runCommand('node', ['test/run-client-tests.js'], path.join(__dirname, 'client'));

        // 5. Production Security, OWASP Headers, CORS & Rate Limiting Tests
        console.log('\n[5/6] Testing Production Security, OWASP Headers, CORS & Rate Limiting...');
        await runCommand('node', ['test/run-security-tests.js'], __dirname);

        // 6. Client Vite Production Build Compilation
        console.log('\n[6/6] Verifying Client Vite Production Build Compilation...');
        await runCommand('npm', ['run', 'build'], path.join(__dirname, 'client'));

        const duration = ((Date.now() - t0) / 1000).toFixed(2);
        console.log('\n====================================================');
        console.log(`✅ ALL 4-TIER TEST SUITES PASSED CLEANLY in ${duration}s! (Target: <30s)`);
        console.log('====================================================\n');
    } catch (err) {
        console.error('\n❌ Test suite failed:', err.message);
        process.exit(1);
    }
}

runAllSmokeTests();
