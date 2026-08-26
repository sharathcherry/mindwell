import { storage } from '../utils/storage.js';

const AUTH_KEY = 'mindwell_user';
const TOKEN_KEY = 'mindwell_token';
const API_BASE = import.meta.env?.VITE_API_BASE_URL || '/api';

const AUTH_VERSION = 2;
const PBKDF2_ITERATIONS = 120000;
const PBKDF2_HASH = 'SHA-256';
const PBKDF2_KEY_LENGTH = 256;

let inMemoryToken = null;

export function getToken() {
    if (inMemoryToken) return inMemoryToken;
    return storage.get(TOKEN_KEY);
}

export function setToken(token) {
    inMemoryToken = token;
    if (token) {
        storage.set(TOKEN_KEY, token);
    } else {
        storage.remove(TOKEN_KEY);
    }
}

export function clearToken() {
    inMemoryToken = null;
    storage.remove(TOKEN_KEY);
}

export function getUser() {
    return storage.get(AUTH_KEY);
}

export function saveUser(user) {
    return storage.set(AUTH_KEY, user);
}

export async function login(email, password) {
    const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to login');
    }

    if (data.accessToken) {
        setToken(data.accessToken);
    }
    if (data.user) {
        saveUser(data.user);
    }

    return data;
}

export async function signup(userData) {
    const response = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(userData),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data.error || 'Failed to create account');
    }

    if (data.accessToken) {
        setToken(data.accessToken);
    }
    if (data.user) {
        saveUser(data.user);
    }

    return data;
}

export async function refresh() {
    const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    });

    if (!response.ok) {
        clearToken();
        storage.remove(AUTH_KEY);
        throw new Error('Session expired');
    }

    const data = await response.json();
    if (data.accessToken) {
        setToken(data.accessToken);
    }
    if (data.user) {
        saveUser(data.user);
    }

    return data;
}

export function logout() {
    clearToken();
    storage.remove(AUTH_KEY);
    if (typeof fetch === 'function') {
        fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
        }).catch(() => {});
    }
}

export async function logoutAsync() {
    clearToken();
    storage.remove(AUTH_KEY);
    try {
        await fetch(`${API_BASE}/auth/logout`, {
            method: 'POST',
            credentials: 'include',
        });
    } catch {
        // Ignored
    }
}

export async function getMe() {
    const token = getToken();
    const headers = {};
    if (token) {
        headers.Authorization = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE}/auth/me`, {
        headers,
        credentials: 'include',
    });

    if (!response.ok) {
        throw new Error('Unauthorized');
    }

    const data = await response.json();
    if (data.user) {
        saveUser(data.user);
    }
    return data.user;
}

// ── PBKDF2 Password Hashing & Verification (Cryptographic Client Helpers) ──

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
