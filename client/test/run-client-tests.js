import assert from 'node:assert/strict';

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
}

globalThis.localStorage = new LocalStorageMock();

const { storage } = await import('../src/utils/storage.js');
const { saveUser, getUser, logout, hashPassword, verifyPassword } = await import('../src/services/auth.js');

function testStorageRoundTrip() {
    storage.set('k1', { a: 1, b: 'x' });
    const value = storage.get('k1');
    assert.deepEqual(value, { a: 1, b: 'x' });
    storage.remove('k1');
    assert.equal(storage.get('k1'), null);
    console.log('PASS: storage round-trip');
}

function testAuthHelpers() {
    const user = { name: 'Sam', email: 'sam@example.com' };
    saveUser(user);
    assert.deepEqual(getUser(), user);
    logout();
    assert.equal(getUser(), null);
    console.log('PASS: auth helper flow');
}

async function testPasswordHashingFlow() {
    const record = await hashPassword('my-strong-password');
    assert.ok(record.passwordHash);
    assert.ok(record.salt);
    assert.equal(await verifyPassword('my-strong-password', record), true);
    assert.equal(await verifyPassword('wrong-password', record), false);
    console.log('PASS: password hashing + verification');
}

async function run() {
    testStorageRoundTrip();
    testAuthHelpers();
    await testPasswordHashingFlow();
    console.log('\nAll client smoke tests passed (3/3).');
}

run().catch((error) => {
    console.error('\nClient smoke tests failed.');
    console.error(error);
    process.exit(1);
});
