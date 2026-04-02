import { storage } from '../utils/storage.js';

const AUTH_KEY = 'mindwell_user';
const AUTH_VERSION = 2;
const PBKDF2_ITERATIONS = 120000;
const PBKDF2_HASH = 'SHA-256';
const PBKDF2_KEY_LENGTH = 256;

export function getUser() {
    return storage.get(AUTH_KEY);
}

export function logout() {
    storage.remove(AUTH_KEY);
}

export function saveUser(user) {
    return storage.set(AUTH_KEY, user);
}

function toBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
}

function fromBase64(base64) {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return bytes.buffer;
}

function getCryptoApi() {
    if (!globalThis.crypto?.subtle) {
        throw new Error('Secure crypto API is not available in this environment.');
    }
    return globalThis.crypto.subtle;
}

export async function hashPassword(password) {
    const subtle = getCryptoApi();
    const saltBytes = new Uint8Array(16);
    globalThis.crypto.getRandomValues(saltBytes);

    const encoder = new TextEncoder();
    const passwordKey = await subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    const derivedBits = await subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: saltBytes,
            iterations: PBKDF2_ITERATIONS,
            hash: PBKDF2_HASH,
        },
        passwordKey,
        PBKDF2_KEY_LENGTH
    );

    return {
        version: AUTH_VERSION,
        algorithm: 'PBKDF2',
        hash: PBKDF2_HASH,
        iterations: PBKDF2_ITERATIONS,
        salt: toBase64(saltBytes.buffer),
        passwordHash: toBase64(derivedBits),
    };
}

export async function verifyPassword(password, account) {
    if (!account?.passwordHash || !account?.salt || !account?.iterations) {
        return false;
    }

    const subtle = getCryptoApi();
    const encoder = new TextEncoder();
    const passwordKey = await subtle.importKey(
        'raw',
        encoder.encode(password),
        { name: 'PBKDF2' },
        false,
        ['deriveBits']
    );

    const derivedBits = await subtle.deriveBits(
        {
            name: 'PBKDF2',
            salt: new Uint8Array(fromBase64(account.salt)),
            iterations: account.iterations,
            hash: account.hash || PBKDF2_HASH,
        },
        passwordKey,
        PBKDF2_KEY_LENGTH
    );

    return toBase64(derivedBits) === account.passwordHash;
}
