import { prisma } from './db';

/* ══════════════════════════════════════════════════════════════════════
   COMMUNITY CHANNELS

   Always-on, school-wide channels pinned above a student's own study pods.
   Structurally they are StudyPod rows with kind='community', so they reuse
   the existing message, reaction, and rendering machinery rather than
   duplicating it — the difference is that every student can read and post
   without joining, and they cannot be created, renamed, or left.

   Why these two specifically: each is anchored to something students are
   already doing in the product. #college-essays gives the essay editor a
   place to ask for a second pair of eyes; #college-decisions is fed by the
   application tracker, so marking a result produces something worth reading.
   A channel with no upstream action to feed it goes quiet.
   ══════════════════════════════════════════════════════════════════════ */

export interface CommunityChannelSeed {
  slug: string;
  name: string;
  description: string;
  sortOrder: number;
}

export const COMMUNITY_CHANNELS: CommunityChannelSeed[] = [
  {
    slug: 'college-essays',
    name: 'CollegeEssays',
    description:
      'Swap essay drafts, ask for a second pair of eyes, and brainstorm angles when a prompt has you stuck. Be specific about the feedback you want, and give as much as you take.',
    sortOrder: 1,
  },
  {
    slug: 'college-decisions',
    name: 'CollegeDecisions',
    description:
      'Share where you got in, where you did not, and what you are deciding between. Every outcome is welcome here — the waitlists and the rejections are part of the picture too.',
    sortOrder: 2,
  },
];

/** Create the fixed channels if they are missing. Safe to call repeatedly. */
export async function ensureCommunityChannels(): Promise<void> {
  try {
    for (const ch of COMMUNITY_CHANNELS) {
      await prisma.$executeRaw`
        INSERT INTO "study_pods" ("id", "name", "description", "inviteCode", "kind", "slug", "sortOrder", "updatedAt")
        VALUES (${`community_${ch.slug}`}, ${ch.name}, ${ch.description},
                ${`COMMUNITY-${ch.slug.toUpperCase()}`}, 'community', ${ch.slug}, ${ch.sortOrder}, CURRENT_TIMESTAMP)
        ON CONFLICT ("id") DO UPDATE
          SET "name" = EXCLUDED."name",
              "description" = EXCLUDED."description",
              "sortOrder" = EXCLUDED."sortOrder",
              "kind" = 'community',
              "slug" = EXCLUDED."slug"
      `;
    }
  } catch {
    /* best-effort: a missing channel must never break the pods page */
  }
}

/** Community channels, ordered for the sidebar. */
export async function listCommunityChannels(): Promise<
  { id: string; name: string; description: string; slug: string; memberCount: number; messageCount: number }[]
> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT p."id", p."name", p."description", p."slug",
             (SELECT COUNT(*)::int FROM "pod_messages" m WHERE m."podId" = p."id") AS "messageCount",
             (SELECT COUNT(DISTINCT m."userId")::int FROM "pod_messages" m WHERE m."podId" = p."id") AS "memberCount"
        FROM "study_pods" p
       WHERE p."kind" = 'community'
       ORDER BY p."sortOrder" ASC
    `;
    return rows.map(r => ({
      id: r.id, name: r.name, description: r.description, slug: r.slug,
      memberCount: Number(r.memberCount || 0), messageCount: Number(r.messageCount || 0),
    }));
  } catch {
    return [];
  }
}

export async function isCommunityChannel(podId: string): Promise<boolean> {
  try {
    const rows: any[] = await prisma.$queryRaw`
      SELECT 1 FROM "study_pods" WHERE "id" = ${podId} AND "kind" = 'community' LIMIT 1`;
    return rows.length > 0;
  } catch {
    return false;
  }
}

export function channelIdForSlug(slug: string): string {
  return `community_${slug}`;
}
