import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';
import { isPaypalConfigured } from '../../../lib/paypal';

/* ──────────────────────────────────────────────────────────────────────
   ADMIN — ESSAY LIBRARY SALES (one-time PayPal purchases)

   Surfaces revenue from essay_purchases (the UC Vault / Full Repository
   tiers) — separate from the subscription-plan MRR shown elsewhere.
   ────────────────────────────────────────────────────────────────────── */

const n = (v: any) => Number(v || 0);

function tierLabel(scope: string): string {
  if (scope === 'all') return 'Full Repository';
  if (scope === 'university-of-california') return 'UC Essay Vault';
  return scope.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || (session.user as any).role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const q = async <T>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    try { return await fn(); } catch { return fallback; }
  };

  // Revenue + count per tier (scope).
  const byScope = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT "scope", COUNT(*)::int AS count, COALESCE(SUM("amountCents"), 0)::bigint AS cents
      FROM "essay_purchases" WHERE "status" = 'active'
      GROUP BY "scope"
    `;
    return rows.map((r) => ({ scope: r.scope, count: n(r.count), revenueCents: n(r.cents) }));
  }, []);

  const totalRevenueCents = byScope.reduce((s, r) => s + r.revenueCents, 0);
  const totalCount = byScope.reduce((s, r) => s + r.count, 0);

  const byTier = byScope
    .map((r) => ({ key: r.scope, label: tierLabel(r.scope), count: r.count, revenueCents: r.revenueCents }))
    .sort((a, b) => b.revenueCents - a.revenueCents);

  // This month.
  const month = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT COUNT(*)::int AS count, COALESCE(SUM("amountCents"), 0)::bigint AS cents
      FROM "essay_purchases" WHERE "status" = 'active' AND "createdAt" >= ${startOfMonth}
    `;
    return { count: n(rows[0]?.count), revenueCents: n(rows[0]?.cents) };
  }, { count: 0, revenueCents: 0 });

  // Most recent purchases (with buyer, for the activity feed).
  const recent = await q(async () => {
    const rows: any[] = await prisma.$queryRaw`
      SELECT ep."id", ep."scope", ep."amountCents" AS cents, ep."createdAt", u."name", u."email"
      FROM "essay_purchases" ep
      JOIN "users" u ON u."id" = ep."userId"
      WHERE ep."status" = 'active'
      ORDER BY ep."createdAt" DESC
      LIMIT 12
    `;
    return rows.map((r) => ({
      id: r.id,
      name: r.name || 'Student',
      email: r.email || '',
      label: tierLabel(r.scope),
      amountCents: n(r.cents),
      createdAt: r.createdAt,
    }));
  }, []);

  return res.json({
    configured: isPaypalConfigured(),
    totalRevenueCents,
    totalCount,
    month,
    byTier,
    recent,
  });
}
