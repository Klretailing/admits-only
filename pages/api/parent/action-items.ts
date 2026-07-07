import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';
import { colleges } from '../../../lib/colleges';

function genId() {
  return `pai_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

const DAY_MS = 86400000;

// Names of Private colleges (lowercased) for CSS Profile relevance.
const PRIVATE_COLLEGE_NAMES = new Set(
  colleges.filter((c) => c.type === 'Private').map((c) => c.name.toLowerCase())
);

function parseDate(v: any): Date | null {
  if (!v) return null;
  const d = new Date(v);
  return isNaN(d.getTime()) ? null : d;
}

function daysBetween(target: Date, from: Date): number {
  return Math.ceil((target.getTime() - from.getTime()) / DAY_MS);
}

function fmtDate(v: any): string {
  const d = parseDate(v);
  if (!d) return '';
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

interface Suggestion {
  label: string;
  category: string;
  schoolName?: string | null;
  dueDate?: string | null;
}

// Derive parent-owned suggested action items from a student's REAL applications.
// Every path is defensive; the caller wraps this in its own try/catch too.
function buildSuggestions(
  applications: any[],
  studentName: string,
  existingLabels: Set<string>,
  now: Date
): Suggestion[] {
  const apps = Array.isArray(applications) ? applications : [];
  const out: Suggestion[] = [];

  const push = (s: Suggestion) => {
    if (!s.label) return;
    const key = s.label.toLowerCase().trim();
    if (existingLabels.has(key)) return;
    if (out.some((o) => o.label.toLowerCase().trim() === key)) return;
    out.push(s);
  };

  if (apps.length === 0) return out;

  // Earliest deadline across the real list (FAFSA nudge target).
  const deadlines = apps
    .map((a) => parseDate(a?.deadline))
    .filter((d): d is Date => !!d)
    .sort((a, b) => a.getTime() - b.getTime());
  const earliest = deadlines[0];

  // FAFSA — always relevant with ≥1 application.
  push({
    label: 'Complete the FAFSA',
    category: 'financial',
    dueDate: earliest ? (apps.find((a) => parseDate(a?.deadline)?.getTime() === earliest.getTime())?.deadline ?? null) : null,
  });

  // CSS Profile — relevant if any school is Private.
  const hasPrivate = apps.some((a) => PRIVATE_COLLEGE_NAMES.has(String(a?.name || '').toLowerCase()));
  if (hasPrivate) {
    push({ label: 'Complete the CSS Profile', category: 'financial' });
  }

  // Per early-deadline school (ED / EA / REA / ED2): review before the deadline.
  for (const a of apps) {
    const norm = String(a?.type || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const isEarly = norm.startsWith('ed') || norm.startsWith('ea') || norm === 'rea' || norm.includes('early') || norm.includes('restrictive');
    if (isEarly && a?.name) {
      const when = fmtDate(a?.deadline);
      push({
        label: `Review ${a.name} early application before the ${when || 'upcoming'} deadline`,
        category: 'deadline',
        schoolName: a.name,
        dueDate: a?.deadline ?? null,
      });
    }
  }

  // Enrollment deposit — for any accepted school.
  for (const a of apps) {
    if (String(a?.status || '').toLowerCase() === 'accepted' && a?.name) {
      push({ label: `Submit enrollment deposit for ${a.name}`, category: 'deposit', schoolName: a.name });
    }
  }

  // Fee waiver — generic, once.
  push({ label: 'Request fee waiver if eligible', category: 'financial' });

  // Budget discussion — once.
  push({ label: `Discuss college budget with ${studentName || 'your student'}`, category: 'planning' });

  // Deadline nudges — unresolved apps due within ~30 days.
  for (const a of apps) {
    const d = parseDate(a?.deadline);
    if (!d || !a?.name) continue;
    const status = String(a?.status || '').toLowerCase();
    if (['submitted', 'accepted', 'rejected', 'waitlisted', 'deferred'].includes(status)) continue;
    const days = daysBetween(d, now);
    if (days >= 0 && days <= 30) {
      const type = a?.type ? String(a.type).toUpperCase() : '';
      const label = `${a.name}${type ? ` ${type}` : ''} deadline approaching (${fmtDate(a?.deadline)})`;
      push({ label, category: 'deadline', schoolName: a.name, dueDate: a?.deadline ?? null });
    }
  }

  return out;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = (session.user as any).id as string;
  await ensureSchema();

  if (req.method === 'GET') {
    // Smart task seeding: derive suggested parent action items from the
    // connected student's real applications.
    if (req.query.action === 'suggestions') {
      try {
        const connections: any[] = await prisma.$queryRaw`
          SELECT ac."studentId", u."name" as "studentName"
          FROM "account_connections" ac
          JOIN "users" u ON u."id" = ac."studentId"
          WHERE ac."connectedUserId" = ${userId} AND ac."role" = 'parent'
        `;
        if (connections.length === 0) return res.json({ suggestions: [] });

        const existing: any[] = await prisma.$queryRaw`
          SELECT "label" FROM "parent_action_items" WHERE "userId" = ${userId}
        `;
        const existingLabels = new Set(
          existing.map((r) => String(r.label || '').toLowerCase().trim())
        );

        const now = new Date();
        const suggestions: Suggestion[] = [];
        for (const conn of connections) {
          let applications: any[] = [];
          try {
            const appRows: any[] = await prisma.$queryRaw`
              SELECT "data" FROM "saved_applications" WHERE "userId" = ${conn.studentId}
            `;
            applications = appRows[0]?.data || [];
            if (typeof applications === 'string') {
              try { applications = JSON.parse(applications); } catch { applications = []; }
            }
          } catch {}
          const built = buildSuggestions(applications, conn.studentName || 'your student', existingLabels, now);
          for (const s of built) {
            const key = s.label.toLowerCase().trim();
            if (suggestions.some((o) => o.label.toLowerCase().trim() === key)) continue;
            suggestions.push(s);
          }
        }
        return res.json({ suggestions });
      } catch {
        return res.json({ suggestions: [] });
      }
    }

    try {
      const items: any[] = await prisma.$queryRaw`
        SELECT * FROM "parent_action_items"
        WHERE "userId" = ${userId}
        ORDER BY "done" ASC, "createdAt" ASC
      `;
      return res.json({ items });
    } catch {
      return res.json({ items: [] });
    }
  }

  if (req.method === 'POST') {
    const { items } = req.body;
    if (Array.isArray(items)) {
      for (const item of items) {
        const id = item.id || genId();
        await prisma.$executeRaw`
          INSERT INTO "parent_action_items" ("id", "userId", "label", "category", "schoolName", "done", "dueDate")
          VALUES (${id}, ${userId}, ${item.label}, ${item.category || 'custom'}, ${item.schoolName || null}, ${item.done || false}, ${item.dueDate || null})
          ON CONFLICT ("id") DO UPDATE SET
            "label" = EXCLUDED."label",
            "category" = EXCLUDED."category",
            "schoolName" = EXCLUDED."schoolName",
            "done" = EXCLUDED."done",
            "dueDate" = EXCLUDED."dueDate",
            "updatedAt" = CURRENT_TIMESTAMP
        `;
      }
      return res.json({ ok: true });
    }

    const { label, category, schoolName, dueDate } = req.body;
    if (!label) return res.status(400).json({ error: 'label is required' });
    const id = genId();
    await prisma.$executeRaw`
      INSERT INTO "parent_action_items" ("id", "userId", "label", "category", "schoolName", "dueDate")
      VALUES (${id}, ${userId}, ${label}, ${category || 'custom'}, ${schoolName || null}, ${dueDate || null})
    `;
    return res.json({ ok: true, id });
  }

  if (req.method === 'PUT') {
    const { id, done, label } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });
    if (typeof done === 'boolean') {
      await prisma.$executeRaw`
        UPDATE "parent_action_items" SET "done" = ${done}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id} AND "userId" = ${userId}
      `;
    }
    if (label) {
      await prisma.$executeRaw`
        UPDATE "parent_action_items" SET "label" = ${label}, "updatedAt" = CURRENT_TIMESTAMP
        WHERE "id" = ${id} AND "userId" = ${userId}
      `;
    }
    return res.json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });
    await prisma.$executeRaw`
      DELETE FROM "parent_action_items" WHERE "id" = ${id} AND "userId" = ${userId}
    `;
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
