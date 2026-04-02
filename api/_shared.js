export function isPlainObject(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function isNonEmptyString(value) {
    return typeof value === 'string' && value.trim().length > 0;
}

export function normalizeArray(value, maxItems = 50) {
    if (!Array.isArray(value)) return [];
    return value.slice(-maxItems);
}

export function methodNotAllowed(res) {
    res.status(405).json({ error: 'Method not allowed' });
}

