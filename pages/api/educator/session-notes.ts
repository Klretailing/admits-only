import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || !['educator','admin'].includes((session.user as any).role)) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;
  await ensureSchema();

  /* ─── GET: List notes ─── */
  if (req.method === 'GET') {
    try {
      const showArchived = req.query.archived === 'true';
      const notes: any[] = await prisma.$queryRaw`
        SELECT * FROM "tutor_session_notes"
        WHERE "educatorId" = ${userId}
          AND "archived" = ${showArchived}
        ORDER BY "pinned" DESC, "sortOrder" ASC, "updatedAt" DESC
      `;
      return res.json({ notes });
    } catch (e) {
      console.error('Fetch session notes error:', (e as Error).message);
      return res.status(500).json({ error: 'Failed to fetch notes' });
    }
  }

  /* ─── POST: Create a note ─── */
  if (req.method === 'POST') {
    try {
      const { title, content, color, student, subject, grade, lessonDate, template, data } = req.body || {};
      const id = 'sn_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const noteTitle = typeof title === 'string' && title.trim() ? title.trim() : 'Untitled';
      const noteContent = typeof content === 'string' ? content : '';
      const noteColor = typeof color === 'string' && color.trim() ? color.trim() : 'default';
      const str = (v: any) => (typeof v === 'string' ? v : '');
      const dataJson = data && typeof data === 'object' ? JSON.stringify(data) : '{}';

      await prisma.$executeRaw`
        INSERT INTO "tutor_session_notes"
          ("id", "educatorId", "title", "content", "color", "student", "subject", "grade", "lessonDate", "template", "data")
        VALUES (${id}, ${userId}, ${noteTitle}, ${noteContent}, ${noteColor},
                ${str(student)}, ${str(subject)}, ${str(grade)}, ${str(lessonDate)},
                ${typeof template === 'string' && template.trim() ? template.trim() : 'blank'},
                ${dataJson}::jsonb)
      `;

      const rows: any[] = await prisma.$queryRaw`
        SELECT * FROM "tutor_session_notes" WHERE "id" = ${id}
      `;
      return res.status(201).json(rows[0]);
    } catch (e) {
      console.error('Create session note error:', (e as Error).message);
      return res.status(500).json({ error: 'Failed to create note' });
    }
  }

  /* ─── PUT: Update a note ─── */
  if (req.method === 'PUT') {
    try {
      const { id, title, content, color, pinned, archived, sortOrder, student, subject, grade, lessonDate, template, data } = req.body || {};
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Note id is required' });
      }

      // Verify ownership
      const existing: any[] = await prisma.$queryRaw`
        SELECT "id" FROM "tutor_session_notes"
        WHERE "id" = ${id} AND "educatorId" = ${userId}
      `;
      if (existing.length === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }

      // Build SET clauses for provided fields
      const sets: string[] = ['"updatedAt" = CURRENT_TIMESTAMP'];
      const values: any[] = [];

      if (typeof title === 'string') {
        values.push(title);
        sets.push(`"title" = $${values.length}`);
      }
      if (typeof content === 'string') {
        values.push(content);
        sets.push(`"content" = $${values.length}`);
      }
      if (typeof color === 'string') {
        values.push(color);
        sets.push(`"color" = $${values.length}`);
      }
      if (typeof pinned === 'boolean') {
        values.push(pinned);
        sets.push(`"pinned" = $${values.length}`);
      }
      if (typeof archived === 'boolean') {
        values.push(archived);
        sets.push(`"archived" = $${values.length}`);
      }
      if (typeof sortOrder === 'number') {
        values.push(sortOrder);
        sets.push(`"sortOrder" = $${values.length}`);
      }
      for (const [field, val] of [
        ['student', student], ['subject', subject], ['grade', grade],
        ['lessonDate', lessonDate], ['template', template],
      ] as const) {
        if (typeof val === 'string') {
          values.push(val);
          sets.push(`"${field}" = $${values.length}`);
        }
      }
      if (data && typeof data === 'object') {
        values.push(JSON.stringify(data));
        sets.push(`"data" = $${values.length}::jsonb`);
      }

      values.push(id);
      values.push(userId);
      const whereIdx = values.length;

      const sql = `UPDATE "tutor_session_notes" SET ${sets.join(', ')} WHERE "id" = $${whereIdx - 1} AND "educatorId" = $${whereIdx}`;
      await prisma.$executeRawUnsafe(sql, ...values);

      const updated: any[] = await prisma.$queryRaw`
        SELECT * FROM "tutor_session_notes" WHERE "id" = ${id}
      `;
      return res.json(updated[0]);
    } catch (e) {
      console.error('Update session note error:', (e as Error).message);
      return res.status(500).json({ error: 'Failed to update note' });
    }
  }

  /* ─── DELETE: Remove a note ─── */
  if (req.method === 'DELETE') {
    try {
      const { id } = req.body || {};
      if (!id || typeof id !== 'string') {
        return res.status(400).json({ error: 'Note id is required' });
      }

      const result = await prisma.$executeRaw`
        DELETE FROM "tutor_session_notes"
        WHERE "id" = ${id} AND "educatorId" = ${userId}
      `;

      if (result === 0) {
        return res.status(404).json({ error: 'Note not found' });
      }

      return res.json({ ok: true });
    } catch (e) {
      console.error('Delete session note error:', (e as Error).message);
      return res.status(500).json({ error: 'Failed to delete note' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
