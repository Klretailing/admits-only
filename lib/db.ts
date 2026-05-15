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
        "plan"      TEXT,
        "planStartedAt" TIMESTAMP(3),
        "lastLoginAt"   TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "users_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "users_email_key" UNIQUE ("email")
      );
    `);

    // Add new columns if tables already exist (ALTER is idempotent via IF NOT EXISTS workaround)
    await prisma.$executeRawUnsafe(`DO $$ BEGIN ALTER TABLE "users" ADD COLUMN "plan" TEXT; EXCEPTION WHEN duplicate_column THEN NULL; END $$;`);
    await prisma.$executeRawUnsafe(`DO $$ BEGIN ALTER TABLE "users" ADD COLUMN "planStartedAt" TIMESTAMP(3); EXCEPTION WHEN duplicate_column THEN NULL; END $$;`);
    await prisma.$executeRawUnsafe(`DO $$ BEGIN ALTER TABLE "users" ADD COLUMN "lastLoginAt" TIMESTAMP(3); EXCEPTION WHEN duplicate_column THEN NULL; END $$;`);

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
        "id"         TEXT NOT NULL,
        "type"       TEXT NOT NULL,
        "timestamp"  TIMESTAMP(3) NOT NULL,
        "path"       TEXT NOT NULL,
        "sessionId"  TEXT,
        "userId"     TEXT,
        "referrer"   TEXT,
        "meta"       JSONB,
        "deviceInfo" JSONB,
        "createdAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "analytics_events_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`ALTER TABLE "analytics_events" ADD COLUMN IF NOT EXISTS "sessionId" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "analytics_events" ADD COLUMN IF NOT EXISTS "userId" TEXT`);
    await prisma.$executeRawUnsafe(`ALTER TABLE "analytics_events" ADD COLUMN IF NOT EXISTS "deviceInfo" JSONB`);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "analytics_events_sessionId_idx" ON "analytics_events" ("sessionId");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "analytics_events_userId_idx" ON "analytics_events" ("userId");
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

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "agent_conversations" (
        "id"        TEXT NOT NULL,
        "userId"    TEXT NOT NULL,
        "title"     TEXT NOT NULL DEFAULT 'New Conversation',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "agent_conversations_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "agent_conversations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "agent_messages" (
        "id"             TEXT NOT NULL,
        "conversationId" TEXT NOT NULL,
        "role"           TEXT NOT NULL,
        "content"        TEXT NOT NULL,
        "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "agent_messages_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "agent_messages_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "agent_conversations"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "agent_memories" (
        "id"          TEXT NOT NULL,
        "userId"      TEXT NOT NULL,
        "facts"       JSONB NOT NULL DEFAULT '[]',
        "preferences" JSONB NOT NULL DEFAULT '{}',
        "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "agent_memories_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "agent_memories_userId_key" UNIQUE ("userId"),
        CONSTRAINT "agent_memories_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // ─── Educator tables ───
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "educator_profiles" (
        "id"             TEXT NOT NULL,
        "userId"         TEXT NOT NULL,
        "bio"            TEXT NOT NULL DEFAULT '',
        "headline"       TEXT NOT NULL DEFAULT '',
        "credentials"    JSONB NOT NULL DEFAULT '[]',
        "subjects"       JSONB NOT NULL DEFAULT '[]',
        "hourlyRate"     DOUBLE PRECISION,
        "currency"       TEXT NOT NULL DEFAULT 'USD',
        "zoomLink"       TEXT NOT NULL DEFAULT '',
        "googleMeetLink" TEXT NOT NULL DEFAULT '',
        "availability"   JSONB NOT NULL DEFAULT '{}',
        "timezone"       TEXT NOT NULL DEFAULT 'America/New_York',
        "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "educator_profiles_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "educator_profiles_userId_key" UNIQUE ("userId"),
        CONSTRAINT "educator_profiles_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "educator_services" (
        "id"          TEXT NOT NULL,
        "educatorId"  TEXT NOT NULL,
        "name"        TEXT NOT NULL,
        "description" TEXT NOT NULL DEFAULT '',
        "duration"    INTEGER NOT NULL DEFAULT 60,
        "price"       DOUBLE PRECISION NOT NULL,
        "currency"    TEXT NOT NULL DEFAULT 'USD',
        "type"        TEXT NOT NULL DEFAULT 'one_on_one',
        "maxStudents" INTEGER NOT NULL DEFAULT 1,
        "active"      BOOLEAN NOT NULL DEFAULT true,
        "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "educator_services_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "educator_services_educatorId_fkey" FOREIGN KEY ("educatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "educator_students" (
        "id"           TEXT NOT NULL,
        "educatorId"   TEXT NOT NULL,
        "studentName"  TEXT NOT NULL,
        "studentEmail" TEXT NOT NULL DEFAULT '',
        "tags"         JSONB NOT NULL DEFAULT '[]',
        "notes"        JSONB NOT NULL DEFAULT '[]',
        "status"       TEXT NOT NULL DEFAULT 'active',
        "startDate"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "educator_students_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "educator_students_educatorId_fkey" FOREIGN KEY ("educatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "educator_students_educatorId_idx" ON "educator_students"("educatorId");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "bookings" (
        "id"          TEXT NOT NULL,
        "educatorId"  TEXT NOT NULL,
        "studentId"   TEXT,
        "serviceId"   TEXT,
        "title"       TEXT NOT NULL,
        "date"        TIMESTAMP(3) NOT NULL,
        "duration"    INTEGER NOT NULL DEFAULT 60,
        "status"      TEXT NOT NULL DEFAULT 'scheduled',
        "meetingLink" TEXT NOT NULL DEFAULT '',
        "platform"    TEXT NOT NULL DEFAULT 'zoom',
        "amount"      DOUBLE PRECISION NOT NULL DEFAULT 0,
        "paid"        BOOLEAN NOT NULL DEFAULT false,
        "notes"       TEXT NOT NULL DEFAULT '',
        "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "bookings_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "bookings_educatorId_fkey" FOREIGN KEY ("educatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "bookings_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "educator_students"("id") ON DELETE SET NULL ON UPDATE CASCADE,
        CONSTRAINT "bookings_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "educator_services"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "bookings_educatorId_date_idx" ON "bookings"("educatorId", "date");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "manual_earnings" (
        "id"          TEXT NOT NULL,
        "educatorId"  TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "hours"       DOUBLE PRECISION NOT NULL,
        "amount"      DOUBLE PRECISION NOT NULL,
        "date"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "manual_earnings_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "manual_earnings_educatorId_fkey" FOREIGN KEY ("educatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "manual_earnings_educatorId_idx" ON "manual_earnings"("educatorId");`);

    // ─── Pod Document Collaboration tables ───
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "pod_documents" (
        "id"          TEXT NOT NULL,
        "podId"       TEXT NOT NULL,
        "uploaderId"  TEXT NOT NULL,
        "fileName"    TEXT NOT NULL,
        "fileType"    TEXT NOT NULL,
        "fileSize"    INTEGER NOT NULL,
        "content"     TEXT NOT NULL DEFAULT '',
        "fileData"    TEXT NOT NULL DEFAULT '',
        "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pod_documents_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "pod_documents_podId_fkey" FOREIGN KEY ("podId") REFERENCES "study_pods"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "pod_documents_uploaderId_fkey" FOREIGN KEY ("uploaderId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pod_documents_podId_idx" ON "pod_documents"("podId");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "document_comments" (
        "id"          TEXT NOT NULL,
        "documentId"  TEXT NOT NULL,
        "userId"      TEXT NOT NULL,
        "content"     TEXT NOT NULL,
        "section"     TEXT NOT NULL DEFAULT '',
        "parentId"    TEXT,
        "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "document_comments_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "document_comments_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "pod_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "document_comments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "document_comments_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "document_comments"("id") ON DELETE SET NULL ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "document_comments_documentId_idx" ON "document_comments"("documentId");`);

    // ─── Pod Study Sessions tables ───
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "pod_study_sessions" (
        "id"             TEXT NOT NULL,
        "podId"          TEXT NOT NULL,
        "creatorId"      TEXT NOT NULL,
        "title"          TEXT NOT NULL DEFAULT 'Focus Session',
        "focusDuration"  INTEGER NOT NULL DEFAULT 25,
        "breakDuration"  INTEGER NOT NULL DEFAULT 5,
        "rounds"         INTEGER NOT NULL DEFAULT 4,
        "status"         TEXT NOT NULL DEFAULT 'waiting',
        "currentRound"   INTEGER NOT NULL DEFAULT 0,
        "startedAt"      TIMESTAMP(3),
        "endsAt"         TIMESTAMP(3),
        "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pod_study_sessions_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "pod_study_sessions_podId_fkey" FOREIGN KEY ("podId") REFERENCES "study_pods"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "pod_study_sessions_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pod_study_sessions_podId_idx" ON "pod_study_sessions"("podId");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "session_participants" (
        "id"         TEXT NOT NULL,
        "sessionId"  TEXT NOT NULL,
        "userId"     TEXT NOT NULL,
        "goal"       TEXT NOT NULL DEFAULT '',
        "completed"  BOOLEAN NOT NULL DEFAULT false,
        "joinedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "session_participants_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "session_participants_sessionId_userId_key" UNIQUE ("sessionId", "userId"),
        CONSTRAINT "session_participants_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "pod_study_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "session_participants_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // ─── Essay Library (monetizable successful admissions essays) ───
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "essay_documents" (
        "id"             TEXT NOT NULL,
        "title"          TEXT NOT NULL,
        "collegeName"    TEXT NOT NULL DEFAULT '',
        "prompt"         TEXT NOT NULL DEFAULT '',
        "content"        TEXT NOT NULL DEFAULT '',
        "fileData"       TEXT NOT NULL DEFAULT '',
        "fileType"       TEXT NOT NULL DEFAULT 'text',
        "studentGpa"     TEXT NOT NULL DEFAULT '',
        "studentSat"     TEXT NOT NULL DEFAULT '',
        "studentState"   TEXT NOT NULL DEFAULT '',
        "studentECs"     TEXT NOT NULL DEFAULT '',
        "studentAwards"  TEXT NOT NULL DEFAULT '',
        "isFree"         BOOLEAN NOT NULL DEFAULT true,
        "priceInCents"   INTEGER NOT NULL DEFAULT 0,
        "published"      BOOLEAN NOT NULL DEFAULT true,
        "uploadedById"   TEXT NOT NULL,
        "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "essay_documents_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "essay_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // ─── Message Reactions (persistent) ───
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "pod_message_reactions" (
        "id"        TEXT NOT NULL,
        "messageId" TEXT NOT NULL,
        "userId"    TEXT NOT NULL,
        "emoji"     TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pod_message_reactions_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "pod_message_reactions_messageId_fkey" FOREIGN KEY ("messageId") REFERENCES "pod_messages"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "pod_message_reactions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "pod_message_reactions_unique" UNIQUE ("messageId", "userId", "emoji")
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pod_message_reactions_messageId_idx" ON "pod_message_reactions"("messageId");`);

    // ─── Message Threads (add parentId to pod_messages) ───
    await prisma.$executeRawUnsafe(`ALTER TABLE "pod_messages" ADD COLUMN IF NOT EXISTS "parentId" TEXT;`);

    // ─── Pod Polls ───
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "pod_polls" (
        "id"        TEXT NOT NULL,
        "podId"     TEXT NOT NULL,
        "creatorId" TEXT NOT NULL,
        "question"  TEXT NOT NULL,
        "options"   TEXT NOT NULL DEFAULT '[]',
        "expiresAt" TIMESTAMP(3),
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pod_polls_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "pod_polls_podId_fkey" FOREIGN KEY ("podId") REFERENCES "study_pods"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "pod_polls_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pod_polls_podId_idx" ON "pod_polls"("podId");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "pod_poll_votes" (
        "id"       TEXT NOT NULL,
        "pollId"   TEXT NOT NULL,
        "userId"   TEXT NOT NULL,
        "optionIdx" INTEGER NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pod_poll_votes_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "pod_poll_votes_pollId_fkey" FOREIGN KEY ("pollId") REFERENCES "pod_polls"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "pod_poll_votes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "pod_poll_votes_unique" UNIQUE ("pollId", "userId")
      );
    `);

    // ─── Streaks, XP & Achievements ───
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "pod_member_stats" (
        "id"             TEXT NOT NULL,
        "podId"          TEXT NOT NULL,
        "userId"         TEXT NOT NULL,
        "xp"             INTEGER NOT NULL DEFAULT 0,
        "currentStreak"  INTEGER NOT NULL DEFAULT 0,
        "longestStreak"  INTEGER NOT NULL DEFAULT 0,
        "lastActiveDate" TEXT NOT NULL DEFAULT '',
        "messagesCount"  INTEGER NOT NULL DEFAULT 0,
        "sessionsCount"  INTEGER NOT NULL DEFAULT 0,
        "reactionsGiven" INTEGER NOT NULL DEFAULT 0,
        "docsShared"     INTEGER NOT NULL DEFAULT 0,
        "pollsVoted"     INTEGER NOT NULL DEFAULT 0,
        "achievements"   TEXT NOT NULL DEFAULT '[]',
        "updatedAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pod_member_stats_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "pod_member_stats_unique" UNIQUE ("podId", "userId"),
        CONSTRAINT "pod_member_stats_podId_fkey" FOREIGN KEY ("podId") REFERENCES "study_pods"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "pod_member_stats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // ─── Pod Activity Feed ───
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "pod_activities" (
        "id"        TEXT NOT NULL,
        "podId"     TEXT NOT NULL,
        "userId"    TEXT NOT NULL,
        "type"      TEXT NOT NULL,
        "metadata"  TEXT NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "pod_activities_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "pod_activities_podId_fkey" FOREIGN KEY ("podId") REFERENCES "study_pods"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "pod_activities_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "pod_activities_podId_idx" ON "pod_activities"("podId");`);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "saved_applications" (
        "id"        TEXT NOT NULL,
        "userId"    TEXT NOT NULL,
        "data"      JSONB NOT NULL DEFAULT '[]',
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "saved_applications_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "saved_applications_userId_key" UNIQUE ("userId"),
        CONSTRAINT "saved_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // ─── Connection codes for linking accounts ───
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "connection_codes" (
        "id"        TEXT NOT NULL,
        "userId"    TEXT NOT NULL,
        "code"      TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "connection_codes_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "connection_codes_userId_key" UNIQUE ("userId"),
        CONSTRAINT "connection_codes_code_key" UNIQUE ("code"),
        CONSTRAINT "connection_codes_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    // ─── Account connections (parent/tutor linked to student) ───
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "account_connections" (
        "id"              TEXT NOT NULL,
        "studentId"       TEXT NOT NULL,
        "connectedUserId" TEXT NOT NULL,
        "role"            TEXT NOT NULL,
        "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "account_connections_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "account_connections_unique" UNIQUE ("studentId", "connectedUserId"),
        CONSTRAINT "account_connections_student_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "account_connections_connected_fkey" FOREIGN KEY ("connectedUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "account_connections_studentId_idx" ON "account_connections"("studentId");`);

    // ─── Essay Reviews (tutor review queue) ───
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "essay_reviews" (
        "id"              TEXT NOT NULL,
        "essayId"         TEXT NOT NULL,
        "studentId"       TEXT NOT NULL,
        "tutorId"         TEXT,
        "status"          TEXT NOT NULL DEFAULT 'pending',
        "priority"        TEXT NOT NULL DEFAULT 'normal',
        "studentNote"     TEXT NOT NULL DEFAULT '',
        "tutorFeedback"   TEXT NOT NULL DEFAULT '',
        "annotations"     JSONB NOT NULL DEFAULT '[]',
        "scores"          JSONB NOT NULL DEFAULT '{}',
        "submittedAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "reviewedAt"      TIMESTAMP(3),
        "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "essay_reviews_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "essay_reviews_essayId_fkey" FOREIGN KEY ("essayId") REFERENCES "essays"("id") ON DELETE CASCADE ON UPDATE CASCADE,
        CONSTRAINT "essay_reviews_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "essay_reviews_studentId_idx" ON "essay_reviews"("studentId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "essay_reviews_tutorId_idx" ON "essay_reviews"("tutorId");`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "essay_reviews_status_idx" ON "essay_reviews"("status");`);

    // ─── Tutor Session Notes (Notion-like notepad) ───
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "tutor_session_notes" (
        "id"          TEXT NOT NULL,
        "educatorId"  TEXT NOT NULL,
        "title"       TEXT NOT NULL DEFAULT 'Untitled',
        "content"     TEXT NOT NULL DEFAULT '',
        "color"       TEXT NOT NULL DEFAULT 'default',
        "pinned"      BOOLEAN NOT NULL DEFAULT false,
        "archived"    BOOLEAN NOT NULL DEFAULT false,
        "sortOrder"   INTEGER NOT NULL DEFAULT 0,
        "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "tutor_session_notes_pkey" PRIMARY KEY ("id"),
        CONSTRAINT "tutor_session_notes_educatorId_fkey" FOREIGN KEY ("educatorId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "tutor_session_notes_educatorId_idx" ON "tutor_session_notes"("educatorId");`);

    globalForPrisma.schemaReady = true;
  } catch (e) {
    // Tables likely already exist — mark as ready
    globalForPrisma.schemaReady = true;
    console.error('ensureSchema (non-fatal):', (e as Error).message);
  }
}
