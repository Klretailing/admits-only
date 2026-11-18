import { prisma } from './db';

/* ──────────────────────────────────────────────────────────────────────
   Brute-force protection for sign-in (and anything else keyed the same way).

   Failures are counted per key in a fixed window. Too many in the window
   locks the key until the window ends. Stored in Postgres so the limit holds
   across serverless instances, where in-memory counters would reset.

     login:<email>  8 failures / 15 min   one account being guessed
     ip:<address>   50 failures / 15 min  one source trying many accounts
   ────────────────────────────────────────────────────────────────────── */

export const WINDOW_MS = 15 * 60 * 1000;
export const LIMITS = { account: 8, ip: 50 };

let tableReady = false;
async function ensureTable() {
  if (tableReady) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "auth_throttle" (
      "key"         TEXT PRIMARY KEY,
      "failures"    INTEGER NOT NULL DEFAULT 0,
      "windowStart" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "lockedUntil" TIMESTAMP(3)
    )`);
  tableReady = true;
}

/** True while the key is locked out. */
export async function isLocked(key: string): Promise<boolean> {
  await ensureTable();
  const rows: any[] = await prisma.$queryRaw`
    SELECT 1 FROM "auth_throttle" WHERE "key" = ${key} AND "lockedUntil" > NOW() LIMIT 1`;
  return rows.length > 0;
}

/** Count a failure; locks the key once it reaches `limit` within the window. */
export async function recordFailure(key: string, limit: number): Promise<void> {
  await ensureTable();
  const windowSecs = Math.round(WINDOW_MS / 1000);
  // One atomic upsert: start a new window if the old one expired, otherwise
  // increment, and set the lock when the count reaches the limit.
  await prisma.$executeRaw`
    INSERT INTO "auth_throttle" ("key", "failures", "windowStart")
    VALUES (${key}, 1, NOW())
    ON CONFLICT ("key") DO UPDATE SET
      "failures" = CASE WHEN "auth_throttle"."windowStart" < NOW() - make_interval(secs => ${windowSecs})
                        THEN 1 ELSE "auth_throttle"."failures" + 1 END,
      "windowStart" = CASE WHEN "auth_throttle"."windowStart" < NOW() - make_interval(secs => ${windowSecs})
                           THEN NOW() ELSE "auth_throttle"."windowStart" END`;
  await prisma.$executeRaw`
    UPDATE "auth_throttle" SET "lockedUntil" = NOW() + make_interval(secs => ${windowSecs})
    WHERE "key" = ${key} AND "failures" >= ${limit} AND ("lockedUntil" IS NULL OR "lockedUntil" < NOW())`;
}

/** Forget failures after a successful sign-in. */
export async function clearFailures(key: string): Promise<void> {
  await ensureTable();
  await prisma.$executeRaw`DELETE FROM "auth_throttle" WHERE "key" = ${key}`;
}

/** The caller's address as Vercel reports it (first hop of x-forwarded-for). */
export function clientIp(headers: Record<string, any> | undefined): string {
  const fwd = headers?.['x-forwarded-for'] || headers?.['X-Forwarded-For'];
  const first = (Array.isArray(fwd) ? fwd[0] : String(fwd || '')).split(',')[0].trim();
  return first || String(headers?.['x-real-ip'] || 'unknown');
}
