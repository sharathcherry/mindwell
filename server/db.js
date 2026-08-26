import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded from server directory if not already set
dotenv.config({ path: path.resolve(__dirname, '.env') });

// Fallback to Supabase pooler PostgreSQL database if DATABASE_URL is not set
if (!process.env.DATABASE_URL) {
    process.env.DATABASE_URL = 'postgresql://postgres.ctiyillvkllszcawzwjm:Sharath%4003030@aws-1-ap-south-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1';
}

const globalForPrisma = globalThis;

export const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
    });

if (process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma = prisma;
}

/**
 * Explicitly connect to the database.
 */
export async function connectDb() {
    await prisma.$connect();
    return prisma;
}

/**
 * Explicitly disconnect from the database.
 */
export async function disconnectDb() {
    await prisma.$disconnect();
}

/**
 * Health check querying the underlying database.
 */
export async function checkDbHealth() {
    try {
        await prisma.$queryRaw`SELECT 1`;
        const isPostgres = Boolean(process.env.DATABASE_URL?.startsWith('postgres'));
        return {
            status: 'healthy',
            engine: isPostgres ? 'postgresql' : 'sqlite',
        };
    } catch (err) {
        return {
            status: 'unhealthy',
            error: err.message,
        };
    }
}

export default prisma;
