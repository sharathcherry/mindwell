import { z } from 'zod';

/**
 * MindWell Zod Validation Schemas
 * Enterprise Request Validation & Input Sanitization
 */

export const signupSchema = z.object({
    email: z
        .string({ required_error: 'Valid email is required', invalid_type_error: 'Email must be a string' })
        .trim()
        .email('Invalid or missing email address'),
    password: z
        .string({ required_error: 'Password is required', invalid_type_error: 'Password must be a string' })
        .min(8, 'Password must be at least 8 characters')
        .max(128, 'Password must not exceed 128 characters'),
    name: z.string({ invalid_type_error: 'Name must be a string' }).optional().nullable(),
    timezone: z.string({ invalid_type_error: 'Timezone must be a string' }).optional().nullable(),
    locale: z.string({ invalid_type_error: 'Locale must be a string' }).optional().nullable(),
}).passthrough();

export const loginSchema = z.object({
    email: z
        .string({ required_error: 'Email is required', invalid_type_error: 'Email must be a string' })
        .trim()
        .email('Valid email is required'),
    password: z
        .string({ required_error: 'Password is required', invalid_type_error: 'Password must be a string' })
        .min(1, 'Password must be at least 1 character'),
}).passthrough();

export const chatSchema = z.object({
    message: z
        .string({ required_error: 'Message is required', invalid_type_error: 'Message must be a string' })
        .trim()
        .min(1, 'Message is required')
        .max(4000, 'Message must not exceed 4000 characters'),
    conversationId: z
        .string({ invalid_type_error: 'conversationId must be a string' })
        .uuid('conversationId must be a valid UUID')
        .optional()
        .nullable(),
    conversationHistory: z.array(z.any()).optional().nullable(),
    userContext: z.record(z.any()).optional().nullable(),
}).passthrough();

export const moodLogSchema = z.object({
    mood: z
        .number({ required_error: 'Mood rating is required', invalid_type_error: 'Mood rating must be a number' })
        .int('Mood rating must be an integer between 1 and 5')
        .min(1, 'Mood rating must be an integer between 1 and 5')
        .max(5, 'Mood rating must be an integer between 1 and 5'),
    emoji: z.string({ invalid_type_error: 'Emoji must be a string' }).optional().nullable(),
    tags: z
        .union([z.array(z.string()), z.string()], {
            invalid_type_error: 'Tags must be an array of strings or comma-separated string',
        })
        .optional()
        .nullable(),
    notes: z
        .string({ invalid_type_error: 'Notes must be a string' })
        .max(2000, 'Notes must not exceed 2000 characters')
        .optional()
        .nullable(),
    note: z
        .string({ invalid_type_error: 'Note must be a string' })
        .max(2000, 'Note must not exceed 2000 characters')
        .optional()
        .nullable(),
    label: z.string({ invalid_type_error: 'Label must be a string' }).optional().nullable(),
    timestamp: z
        .string({ invalid_type_error: 'Timestamp must be a string' })
        .refine((val) => !isNaN(Date.parse(val)), {
            message: 'Invalid ISO timestamp format',
        })
        .optional()
        .nullable(),
}).passthrough();

export const journalEntrySchema = z.object({
    title: z
        .string({ required_error: 'Title is required', invalid_type_error: 'Title must be a string' })
        .trim()
        .min(1, 'Title is required and must be non-empty')
        .max(200, 'Title must not exceed 200 characters'),
    prompt: z.string({ invalid_type_error: 'Prompt must be a string' }).optional().nullable(),
    content: z
        .string({ required_error: 'Content is required', invalid_type_error: 'Content must be a string' })
        .trim()
        .min(1, 'Content is required and must be non-empty')
        .max(50000, 'Content must not exceed 50,000 characters'),
    moodTag: z.string({ invalid_type_error: 'MoodTag must be a string' }).optional().nullable(),
}).passthrough();

export const journalUpdateSchema = z.object({
    title: z
        .string({ invalid_type_error: 'Title must be a string' })
        .trim()
        .min(1, 'Title must be non-empty')
        .max(200, 'Title must not exceed 200 characters')
        .optional(),
    prompt: z.string({ invalid_type_error: 'Prompt must be a string' }).optional().nullable(),
    content: z
        .string({ invalid_type_error: 'Content must be a string' })
        .trim()
        .min(1, 'Content must be non-empty')
        .max(50000, 'Content must not exceed 50,000 characters')
        .optional(),
    moodTag: z.string({ invalid_type_error: 'MoodTag must be a string' }).optional().nullable(),
}).passthrough();

export const reportSchema = z.object({
    format: z.string({ invalid_type_error: 'Format must be a string' }).optional().nullable(),
    userContext: z.record(z.any()).optional().nullable(),
    timeRange: z.string({ invalid_type_error: 'timeRange must be a string' }).optional().nullable(),
    conversationHistory: z.array(z.any()).optional().nullable(),
    moods: z.array(z.any()).optional().nullable(),
    journals: z.array(z.any()).optional().nullable(),
}).passthrough();
