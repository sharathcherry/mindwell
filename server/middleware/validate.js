/**
 * Request Validation Middleware using Zod Schemas
 * MindWell Enterprise Input Hardening
 */

export function validateBody(schema) {
    return (req, res, next) => {
        if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
            return res.status(400).json({
                error: 'Request body must be a JSON object',
                message: 'Request body must be a JSON object',
                details: [{ message: 'Request body must be a JSON object' }],
            });
        }

        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            const firstIssue = parsed.error.issues?.[0];
            const issueMessage = firstIssue?.message;
            const errorMessage = (issueMessage && issueMessage !== 'Required' && !issueMessage.startsWith('Invalid input'))
                ? issueMessage
                : 'Validation failed';

            return res.status(400).json({
                error: errorMessage,
                message: errorMessage,
                details: parsed.error.issues,
            });
        }

        req.validatedBody = parsed.data;
        next();
    };
}

export function validateQuery(schema) {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.query || {});
        if (!parsed.success) {
            return res.status(400).json({
                error: 'Query validation failed',
                message: parsed.error.issues?.[0]?.message || 'Query validation failed',
                details: parsed.error.issues,
            });
        }
        req.validatedQuery = parsed.data;
        next();
    };
}

export function validateParams(schema) {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.params || {});
        if (!parsed.success) {
            return res.status(400).json({
                error: 'Params validation failed',
                message: parsed.error.issues?.[0]?.message || 'Params validation failed',
                details: parsed.error.issues,
            });
        }
        req.validatedParams = parsed.data;
        next();
    };
}

export default validateBody;
