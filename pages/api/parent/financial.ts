import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';

/*
 * Parent Financial Planner API
 * ────────────────────────────
 * Auth: any authenticated user (mirrors pages/api/parent/action-items.ts, which
 * gates on session.user and scopes every row by userId — parent-only surfaces
 * are reached through the parent connection, not a hard role check).
 *
 * Contract:
 *   GET                      -> { plan, scholarships }
 *   PUT  { action:'savePlan', ...planFields }         -> { ok, plan }
 *   POST { action:'addScholarship', ...fields }       -> { ok, scholarship }
 *   PUT  { action:'updateScholarship', id, ...fields }-> { ok }
 *   DELETE { action:'deleteScholarship', id }         -> { ok }
 *
 * plan fields: annualBudget, savings, estimatedEFC, incomeBracket, notes, netCostOverrides
 * scholarship fields: name, amount, type, status, schoolName, deadline, notes
 */

function genId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function toNullableNum(v: any): number | null {
  if (v === null || v === undefined || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions);
    if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
    const userId = (session.user as any).id as string;
    await ensureSchema();

    const action = (req.body && req.body.action) || (req.query && req.query.action);

    /* ─── GET: load plan + scholarships ─── */
    if (req.method === 'GET') {
      let plan: any = null;
      try {
        const rows: any[] = await prisma.$queryRaw`
          SELECT * FROM "parent_financial_plan" WHERE "userId" = ${userId} ORDER BY "createdAt" ASC LIMIT 1
        `;
        plan = rows[0] || null;
      } catch {}

      let scholarships: any[] = [];
      try {
        scholarships = await prisma.$queryRaw`
          SELECT * FROM "parent_scholarships" WHERE "userId" = ${userId} ORDER BY "createdAt" ASC
        `;
      } catch {}

      // Create-on-read: return sensible defaults without inserting.
      if (!plan) {
        plan = {
          id: null,
          userId,
          studentId: null,
          annualBudget: 0,
          savings: 0,
          estimatedEFC: null,
          incomeBracket: null,
          notes: '',
          netCostOverrides: {},
        };
      }
      // pg returns jsonb already parsed, but guard against string form.
      if (typeof plan.netCostOverrides === 'string') {
        try { plan.netCostOverrides = JSON.parse(plan.netCostOverrides); } catch { plan.netCostOverrides = {}; }
      }
      if (!plan.netCostOverrides) plan.netCostOverrides = {};

      return res.json({ plan, scholarships });
    }

    /* ─── PUT: savePlan OR updateScholarship ─── */
    if (req.method === 'PUT') {
      if (action === 'savePlan') {
        const {
          studentId = null,
          annualBudget,
          savings,
          estimatedEFC,
          incomeBracket = null,
          notes = '',
          netCostOverrides = {},
        } = req.body || {};

        const overridesJson = JSON.stringify(
          netCostOverrides && typeof netCostOverrides === 'object' ? netCostOverrides : {}
        );

        const existing: any[] = await prisma.$queryRaw`
          SELECT "id" FROM "parent_financial_plan" WHERE "userId" = ${userId} ORDER BY "createdAt" ASC LIMIT 1
        `;

        if (existing.length > 0) {
          await prisma.$executeRaw`
            UPDATE "parent_financial_plan" SET
              "studentId" = ${studentId},
              "annualBudget" = ${toNum(annualBudget)},
              "savings" = ${toNum(savings)},
              "estimatedEFC" = ${toNullableNum(estimatedEFC)},
              "incomeBracket" = ${incomeBracket},
              "notes" = ${notes || ''},
              "netCostOverrides" = ${overridesJson}::jsonb,
              "updatedAt" = CURRENT_TIMESTAMP
            WHERE "id" = ${existing[0].id} AND "userId" = ${userId}
          `;
        } else {
          const id = genId('pfp');
          await prisma.$executeRaw`
            INSERT INTO "parent_financial_plan"
              ("id", "userId", "studentId", "annualBudget", "savings", "estimatedEFC", "incomeBracket", "notes", "netCostOverrides")
            VALUES
              (${id}, ${userId}, ${studentId}, ${toNum(annualBudget)}, ${toNum(savings)},
               ${toNullableNum(estimatedEFC)}, ${incomeBracket}, ${notes || ''}, ${overridesJson}::jsonb)
          `;
        }

        const rows: any[] = await prisma.$queryRaw`
          SELECT * FROM "parent_financial_plan" WHERE "userId" = ${userId} ORDER BY "createdAt" ASC LIMIT 1
        `;
        const plan = rows[0] || null;
        if (plan && typeof plan.netCostOverrides === 'string') {
          try { plan.netCostOverrides = JSON.parse(plan.netCostOverrides); } catch { plan.netCostOverrides = {}; }
        }
        return res.json({ ok: true, plan });
      }

      if (action === 'updateScholarship') {
        const { id, name, amount, type, status, schoolName, deadline, notes } = req.body || {};
        if (!id) return res.status(400).json({ error: 'id is required' });
        // Validate ownership.
        const owned: any[] = await prisma.$queryRaw`
          SELECT "id" FROM "parent_scholarships" WHERE "id" = ${id} AND "userId" = ${userId}
        `;
        if (owned.length === 0) return res.status(404).json({ error: 'Not found' });

        await prisma.$executeRaw`
          UPDATE "parent_scholarships" SET
            "name" = ${name ?? ''},
            "amount" = ${toNum(amount)},
            "type" = ${type || 'scholarship'},
            "status" = ${status || 'potential'},
            "schoolName" = ${schoolName || null},
            "deadline" = ${deadline || null},
            "notes" = ${notes || ''},
            "updatedAt" = CURRENT_TIMESTAMP
          WHERE "id" = ${id} AND "userId" = ${userId}
        `;
        return res.json({ ok: true });
      }

      return res.status(400).json({ error: 'Unknown action' });
    }

    /* ─── POST: addScholarship ─── */
    if (req.method === 'POST') {
      if (action === 'addScholarship') {
        const { name, amount, type, status, schoolName, deadline, notes, studentId = null } = req.body || {};
        if (!name || !String(name).trim()) return res.status(400).json({ error: 'name is required' });
        const id = genId('psch');
        await prisma.$executeRaw`
          INSERT INTO "parent_scholarships"
            ("id", "userId", "studentId", "name", "amount", "type", "status", "schoolName", "deadline", "notes")
          VALUES
            (${id}, ${userId}, ${studentId}, ${String(name).trim()}, ${toNum(amount)},
             ${type || 'scholarship'}, ${status || 'potential'}, ${schoolName || null}, ${deadline || null}, ${notes || ''})
        `;
        const rows: any[] = await prisma.$queryRaw`
          SELECT * FROM "parent_scholarships" WHERE "id" = ${id} AND "userId" = ${userId}
        `;
        return res.json({ ok: true, scholarship: rows[0] || null });
      }
      return res.status(400).json({ error: 'Unknown action' });
    }

    /* ─── DELETE: deleteScholarship ─── */
    if (req.method === 'DELETE') {
      const { id } = req.body || {};
      if (!id) return res.status(400).json({ error: 'id is required' });
      await prisma.$executeRaw`
        DELETE FROM "parent_scholarships" WHERE "id" = ${id} AND "userId" = ${userId}
      `;
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    console.error('Parent financial error:', (e as Error).message);
    return res.status(200).json({ error: 'Something went wrong', ok: false });
  }
}
