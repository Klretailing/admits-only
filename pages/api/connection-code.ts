import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { prisma, ensureSchema } from '../../lib/db';

function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 to avoid confusion
  let code = '';
  for (let i = 0; i < 8; i++) {
    if (i === 4) code += '-';
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });
  const userId = (session.user as any).id;
  await ensureSchema();

  // GET — return user's own code + their connections
  if (req.method === 'GET') {
    // Get or create code
    let codeRow: any[] = await prisma.$queryRaw`SELECT * FROM "connection_codes" WHERE "userId" = ${userId}`;
    if (codeRow.length === 0) {
      const id = `cc_${Date.now().toString(36)}`;
      const code = generateCode();
      await prisma.$executeRaw`INSERT INTO "connection_codes" ("id", "userId", "code") VALUES (${id}, ${userId}, ${code})`;
      codeRow = [{ id, userId, code }];
    }

    // Get connections where I'm the student
    const asStudent: any[] = await prisma.$queryRaw`
      SELECT ac.*, u."name" as "connectedName", u."email" as "connectedEmail"
      FROM "account_connections" ac
      JOIN "users" u ON u."id" = ac."connectedUserId"
      WHERE ac."studentId" = ${userId}
    `;

    // Get connections where I'm the parent/tutor
    const asConnected: any[] = await prisma.$queryRaw`
      SELECT ac.*, u."name" as "studentName", u."email" as "studentEmail"
      FROM "account_connections" ac
      JOIN "users" u ON u."id" = ac."studentId"
      WHERE ac."connectedUserId" = ${userId}
    `;

    return res.json({
      code: codeRow[0].code,
      connectionsAsStudent: asStudent,
      connectionsAsParentOrTutor: asConnected,
    });
  }

  // POST — submit someone else's code to connect
  if (req.method === 'POST') {
    const { code, role } = req.body;
    if (!code || !role) return res.status(400).json({ error: 'code and role are required' });
    if (!['parent', 'tutor'].includes(role)) return res.status(400).json({ error: 'role must be parent or tutor' });

    // Find the code
    const codeRows: any[] = await prisma.$queryRaw`SELECT * FROM "connection_codes" WHERE "code" = ${code.toUpperCase().trim()}`;
    if (codeRows.length === 0) return res.status(404).json({ error: 'Invalid code' });

    const studentId = codeRows[0].userId;
    if (studentId === userId) return res.status(400).json({ error: 'Cannot connect to yourself' });

    // Check if already connected
    const existing: any[] = await prisma.$queryRaw`SELECT * FROM "account_connections" WHERE "studentId" = ${studentId} AND "connectedUserId" = ${userId}`;
    if (existing.length > 0) return res.status(400).json({ error: 'Already connected' });

    const connId = `ac_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    await prisma.$executeRaw`
      INSERT INTO "account_connections" ("id", "studentId", "connectedUserId", "role")
      VALUES (${connId}, ${studentId}, ${userId}, ${role})
    `;

    // Get student name
    const studentRows: any[] = await prisma.$queryRaw`SELECT "name" FROM "users" WHERE "id" = ${studentId}`;

    return res.json({ ok: true, studentName: studentRows[0]?.name || 'Student' });
  }

  // DELETE — remove a connection
  if (req.method === 'DELETE') {
    const { connectionId } = req.body;
    if (!connectionId) return res.status(400).json({ error: 'connectionId required' });

    // Only allow removing connections where the user is involved
    await prisma.$executeRaw`
      DELETE FROM "account_connections"
      WHERE "id" = ${connectionId}
      AND ("studentId" = ${userId} OR "connectedUserId" = ${userId})
    `;
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
