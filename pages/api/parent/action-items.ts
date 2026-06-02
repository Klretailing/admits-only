import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';

function genId() {
  return `pai_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = (session.user as any).id as string;
  await ensureSchema();

  if (req.method === 'GET') {
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
