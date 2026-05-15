import type { NextApiRequest, NextApiResponse } from 'next';
import { hash } from 'bcryptjs';
import { prisma, ensureSchema } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    await ensureSchema();

    const email = 'testtutor@admitsonly.com';
    const existing: any[] = await prisma.$queryRaw`SELECT "id" FROM "users" WHERE "email" = ${email}`;

    if (existing.length > 0) {
      return res.json({ message: 'Account already exists', email, password: 'TestTutor@2026' });
    }

    const id = 'usr_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const hashed = await hash('TestTutor@2026', 12);

    await prisma.$executeRaw`
      INSERT INTO "users" ("id", "name", "email", "password", "role", "createdAt", "updatedAt")
      VALUES (${id}, ${'Test Tutor'}, ${email}, ${hashed}, ${'educator'}, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
    `;

    return res.json({ message: 'Fresh tutor account created', email, password: 'TestTutor@2026' });
  } catch (e) {
    console.error('Setup fresh tutor error:', (e as Error).message);
    return res.status(500).json({ error: (e as Error).message });
  }
}
