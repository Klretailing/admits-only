import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient; schemaReady: boolean };

function createPrismaClient(): PrismaClient {
  const url = process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL || '';
  const pool = new pg.Pool({ connectionString: url });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

// Reuse Prisma client across hot-reloads in development
export const prisma = globalForPrisma.prisma || createPrismaClient();

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Create tables if they don't exist yet (runs once per cold start)
export async function ensureSchema() {
  if (globalForPrisma.schemaReady) return;

  try {
    // Users table must exist first (referenced by foreign keys)
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "users" (
        "id"        TEXT NOT NULL,
        "name"      TEXT NOT NULL,
        "email"     TEXT NOT NULL,
        "password"  TEXT NOT NULL,
        "role"      TEXT NOT NULL DEFAULT 'student',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "users_email_key" UNIQUE ("email")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "student_profiles" (
        "id"               TEXT NOT NULL,
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
        "id"               TEXT NOT NULL,
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

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "contact_submissions" (
        "id"        TEXT NOT NULL,
        "name"      TEXT NOT NULL,
        "email"     TEXT NOT NULL,
        "phone"     TEXT,
        "message"   TEXT NOT NULL,
        "read"      BOOLEAN NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "contact_submissions_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "analytics_events" (
        "id"        TEXT NOT NULL,
        "type"      TEXT NOT NULL,
        "timestamp" TIMESTAMP(3) NOT NULL,
        "path"      TEXT NOT NULL,
        "referrer"  TEXT,
        "meta"      JSONB,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "study_pods" (
        "id"          TEXT NOT NULL,
        "name"        TEXT NOT NULL,
        "description" TEXT NOT NULL DEFAULT '',
        "inviteCode"  TEXT NOT NULL,
        "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "study_pods_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "study_pods_inviteCode_key" UNIQUE ("inviteCode")
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "pod_members" (
        "id"       TEXT NOT NULL,
        "podId"    TEXT NOT NULL,
        "userId"   TEXT NOT NULL,
        "role"     TEXT NOT NULL DEFAULT 'member',
        "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pod_members_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "pod_members_podId_userId_key" UNIQUE ("podId", "userId"),
        CONSTRAINT "pod_members_podId_fkey" FOREIGN KEY ("podId") REFERENCES "study_pods"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "pod_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "pod_messages" (
        "id"        TEXT NOT NULL,
        "podId"     TEXT NOT NULL,
        "userId"    TEXT NOT NULL,
        "content"   TEXT NOT NULL,
        "type"      TEXT NOT NULL DEFAULT 'discussion',
        "essayId"   TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pod_messages_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "pod_messages_podId_fkey" FOREIGN KEY ("podId") REFERENCES "study_pods"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "pod_messages_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "motif_boards" (
        "id"        TEXT NOT NULL,
        "userId"    TEXT NOT NULL,
        "title"     TEXT NOT NULL DEFAULT 'Untitled Board',
        "bullets"   JSONB NOT NULL DEFAULT '[]',
        "analysis"  JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "motif_boards_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "motif_boards_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    globalForPrisma.schemaReady = true;
  } catch (e) {
    // Tables likely already exist — mark as ready
    globalForPrisma.schemaReady = true;
    console.error('ensureSchema (non-fatal):', (e as Error).message);
  }
}
