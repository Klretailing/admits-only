import { createHash, randomBytes } from 'crypto';
import { hash } from 'bcryptjs';
import { prisma } from './db';

/* ══════════════════════════════════════════════════════════════════════
   PASSWORD RESET

   Security properties, each deliberate:

   • ONLY THE HASH IS STORED. The emailed token is 32 random bytes; the
     database keeps its SHA-256. Anyone reading the table (a leaked backup, a
     curious admin query) gets nothing they can paste into a URL. SHA-256 is
     right here rather than bcrypt: the token already has 256 bits of entropy,
     so there is nothing to slow down a brute force against.
   • SINGLE USE, SHORT LIFE. A token is consumed on use and dies after
     60 minutes. Using one also kills every other outstanding token for that
     account, so an older email sitting in an inbox stops working.
   • NO ACCOUNT ENUMERATION IN THE RESPONSE. The request endpoint answers
     identically whether or not the email exists. (Registration already says
     "email in use", so this is not airtight site-wide — but the reset form
     should not be the easier oracle.)
   • RATE LIMITED. At most 3 requests per account per hour, so the form
     cannot be used to flood someone's inbox.
   • INTERNAL ACCOUNTS EXCLUDED. @admitsonly.com demo and staff accounts are
     shared and seeded; letting anyone reset the demo login would lock out
     every visitor using it.
   ══════════════════════════════════════════════════════════════════════ */

export const RESET_MINUTES = 60;
const MAX_PER_HOUR = 3;

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

export async function ensureResetSchema(): Promise<void> {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
      "id"        TEXT PRIMARY KEY,
      "userId"    TEXT NOT NULL,
      "tokenHash" TEXT NOT NULL UNIQUE,
      "expiresAt" TIMESTAMP(3) NOT NULL,
      "usedAt"    TIMESTAMP(3),
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
    )`);
  await prisma.$executeRawUnsafe(
    `CREATE INDEX IF NOT EXISTS "password_reset_tokens_user" ON "password_reset_tokens"("userId","createdAt")`);
}

export function isInternalEmail(email: string): boolean {
  return /@([a-z0-9-]+\.)*admitsonly\.com$/i.test(email.trim());
}

export type IssueResult =
  | { status: 'issued'; token: string; user: { id: string; name: string; email: string } }
  | { status: 'no_account' | 'internal' | 'rate_limited' };

/** Create a reset token for this email, if one should be created. The caller
    must respond identically whatever the outcome. */
export async function issueResetToken(rawEmail: string): Promise<IssueResult> {
  await ensureResetSchema();
  const email = rawEmail.trim().toLowerCase();

  const rows: any[] = await prisma.$queryRaw`
    SELECT "id", "name", "email" FROM "users" WHERE LOWER("email") = ${email} LIMIT 1`;
  const user = rows[0];
  if (!user) return { status: 'no_account' };
  if (isInternalEmail(user.email)) return { status: 'internal' };

  const recent: any[] = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS n FROM "password_reset_tokens"
     WHERE "userId" = ${user.id} AND "createdAt" > NOW() - INTERVAL '1 hour'`;
  if (Number(recent[0]?.n || 0) >= MAX_PER_HOUR) return { status: 'rate_limited' };

  const token = randomBytes(32).toString('base64url');
  const expires = new Date(Date.now() + RESET_MINUTES * 60_000);
  await prisma.$executeRaw`
    INSERT INTO "password_reset_tokens" ("id","userId","tokenHash","expiresAt")
    VALUES (${'prt_' + randomBytes(12).toString('hex')}, ${user.id}, ${sha256(token)}, ${expires})`;

  return { status: 'issued', token, user };
}

/** Is this token currently usable? Used to show the form or an "expired" note
    before the student types a new password, rather than after. */
export async function checkResetToken(token: string): Promise<boolean> {
  if (!token || token.length < 20) return false;
  await ensureResetSchema();
  const rows: any[] = await prisma.$queryRaw`
    SELECT 1 FROM "password_reset_tokens"
     WHERE "tokenHash" = ${sha256(token)} AND "usedAt" IS NULL AND "expiresAt" > NOW()`;
  return rows.length > 0;
}

export type ConsumeResult = 'ok' | 'invalid' | 'weak_password';

export async function consumeResetToken(token: string, newPassword: string): Promise<ConsumeResult> {
  if (typeof newPassword !== 'string' || newPassword.length < 8) return 'weak_password';
  if (!token || token.length < 20) return 'invalid';
  await ensureResetSchema();

  /* Claim the token atomically: the UPDATE only matches an unused, unexpired
     row, so two simultaneous submissions of one link cannot both succeed. */
  const claimed: any[] = await prisma.$queryRaw`
    UPDATE "password_reset_tokens" SET "usedAt" = NOW()
     WHERE "tokenHash" = ${sha256(token)} AND "usedAt" IS NULL AND "expiresAt" > NOW()
     RETURNING "userId"`;
  const userId = claimed[0]?.userId;
  if (!userId) return 'invalid';

  const hashed = await hash(newPassword, 12);
  await prisma.$executeRaw`
    UPDATE "users" SET "password" = ${hashed}, "updatedAt" = NOW() WHERE "id" = ${userId}`;

  // Any other link still sitting in an inbox stops working now.
  await prisma.$executeRaw`
    UPDATE "password_reset_tokens" SET "usedAt" = NOW()
     WHERE "userId" = ${userId} AND "usedAt" IS NULL`;

  return 'ok';
}
