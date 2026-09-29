import { prisma } from './db';

/* ══════════════════════════════════════════════════════════════════════
   UNREAD STATE FOR PODS AND COMMUNITY CHANNELS

   The pods sidebar used to call a pod "unread" if anyone had posted in the
   last five minutes — the same for every student, and gone by the time
   anyone came back. So a student returning the next day had no way to see
   that #CollegeDecisions had eight new posts since they last looked, and
   nothing outside the Pods page hinted that anything had happened at all.

   This tracks, per student and pod, when they last had it open. Unread =
   messages after that, excluding their own and hidden ones. A pod they have
   never opened counts the last 7 days, so a new student sees recent activity
   in the community channels instead of either nothing or "412 unread".
   ══════════════════════════════════════════════════════════════════════ */

const FIRST_LOOK_DAYS = 7;

let ready = false;
export async function ensurePodReadSchema(): Promise<void> {
  if (ready) return;
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "pod_reads" (
      "userId"     TEXT NOT NULL,
      "podId"      TEXT NOT NULL,
      "lastReadAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY ("userId", "podId")
    )`);
  ready = true;
}

/** Record that this student is looking at this pod right now. */
export async function markPodRead(userId: string, podId: string): Promise<void> {
  await ensurePodReadSchema();
  await prisma.$executeRaw`
    INSERT INTO "pod_reads" ("userId", "podId", "lastReadAt") VALUES (${userId}, ${podId}, NOW())
    ON CONFLICT ("userId", "podId") DO UPDATE SET "lastReadAt" = NOW()`;
}

/** Unread counts for the given pods, keyed by pod id (pods with 0 omitted). */
export async function unreadCounts(userId: string, podIds: string[]): Promise<Record<string, number>> {
  if (podIds.length === 0) return {};
  await ensurePodReadSchema();
  const rows: { podId: string; n: number }[] = await prisma.$queryRaw`
    SELECT m."podId", COUNT(*)::int AS n
      FROM "pod_messages" m
      LEFT JOIN "pod_reads" r ON r."podId" = m."podId" AND r."userId" = ${userId}
     WHERE m."podId" = ANY(${podIds})
       AND m."hidden" = false
       AND m."userId" <> ${userId}
       AND m."createdAt" > COALESCE(r."lastReadAt", NOW() - (${FIRST_LOOK_DAYS} * INTERVAL '1 day'))
     GROUP BY m."podId"`;
  const out: Record<string, number> = {};
  for (const r of rows) out[r.podId] = Number(r.n);
  return out;
}
