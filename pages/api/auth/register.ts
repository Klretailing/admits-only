import type { NextApiRequest, NextApiResponse } from 'next';
import { createUser } from '../../../lib/auth';
import { prisma } from '../../../lib/db';

async function linkInvite(inviteToken: string, userId: string, name: string, email: string) {
  // Look up the roster row by token; must exist and not already active
  const rows: any[] = await prisma.$queryRaw`
    SELECT "id", "educatorId", "inviteStatus", "studentName", "studentEmail"
    FROM "educator_students"
    WHERE "inviteToken" = ${inviteToken}
  `;
  if (rows.length === 0) return;
  const row = rows[0];
  if (row.inviteStatus === 'active') return;

  // Create tutor connection (student → tutor) if one doesn't already exist
  const existing: any[] = await prisma.$queryRaw`
    SELECT "id" FROM "account_connections"
    WHERE "studentId" = ${userId} AND "connectedUserId" = ${row.educatorId}
  `;
  if (existing.length === 0) {
    const connId = `ac_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    await prisma.$executeRaw`
      INSERT INTO "account_connections" ("id", "studentId", "connectedUserId", "role")
      VALUES (${connId}, ${userId}, ${row.educatorId}, ${'tutor'})
    `;
  }

  // Mark the roster row active and backfill missing name/email
  const newName = row.studentName && row.studentName.trim() ? row.studentName : name;
  const newEmail = row.studentEmail && row.studentEmail.trim() ? row.studentEmail : email;
  await prisma.$executeRaw`
    UPDATE "educator_students"
    SET "inviteStatus" = 'active', "linkedUserId" = ${userId},
        "studentName" = ${newName}, "studentEmail" = ${newEmail}
    WHERE "id" = ${row.id}
  `;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { name, email, password, role, inviteToken } = req.body;

  if (!name || !email || !password || !role) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  if (!['student', 'parent', 'educator', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  // Admin registration requires a secret key to prevent unauthorized admin accounts
  if (role === 'admin') {
    const adminKey = req.body.adminKey || req.headers['x-admin-key'];
    if (adminKey !== process.env.ADMIN_SECRET_KEY) {
      return res.status(403).json({ error: 'Unauthorized: invalid admin key' });
    }
  }

  let user;
  try {
    user = await createUser(name, email, password, role);
  } catch (err: any) {
    return res.status(409).json({ error: err.message || 'Registration failed' });
  }

  // Link the new student to the inviting educator — never block account creation
  if (role === 'student' && inviteToken) {
    try {
      await linkInvite(inviteToken, user.id, name, email);
    } catch (e: any) {
      console.error('Invite link error (non-fatal):', e.message);
    }
  }

  return res.status(201).json({ user });
}
