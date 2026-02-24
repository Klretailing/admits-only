import { PrismaClient, Prisma } from '@prisma/client';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; schemaReady: boolean };

// Reuse Prisma client across hot-reloads in development
export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Create new tables if they don't exist yet (runs once per cold start)
export async function ensureSchema() {
  if (globalForPrisma.schemaReady) return;
  globalForPrisma.schemaReady = true;

  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "student_profiles" (
        "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "userId"           TEXT NOT NULL,
        "gpa"              DOUBLE PRECISION,
        "gpaScale"         TEXT NOT NULL DEFAULT '4.0',
        "satMath"          INTEGER,
        "satRW"            INTEGER,
        "extracurriculars" JSONB NOT NULL DEFAULT '[]',
        "holisticScore"    INTEGER,
        "percentile"       INTEGER,
        "gpaScore"         INTEGER,
        "satScore"         INTEGER,
        "ecScore"          INTEGER,
        "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "student_profiles_userId_key" UNIQUE ("userId"),
        CONSTRAINT "student_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "essays" (
        "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
        "userId"           TEXT NOT NULL,
        "title"            TEXT NOT NULL,
        "prompt"           TEXT NOT NULL DEFAULT '',
        "content"          TEXT NOT NULL DEFAULT '',
        "status"           TEXT NOT NULL DEFAULT 'Draft',
        "aiScore"          DOUBLE PRECISION,
        "vocabScore"       DOUBLE PRECISION,
        "grammarScore"     DOUBLE PRECISION,
        "originalityScore" DOUBLE PRECISION,
        "overallScore"     DOUBLE PRECISION,
        "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "essays_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "essays_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
  } catch (e) {
    // Tables may already exist or DB may not support gen_random_uuid — non-fatal
    console.error('ensureSchema (non-fatal):', (e as Error).message);
  }
}
