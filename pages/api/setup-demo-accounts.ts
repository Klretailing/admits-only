import type { NextApiRequest, NextApiResponse } from 'next';
import { hash } from 'bcryptjs';
import { prisma, ensureSchema } from '../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  await ensureSchema();

  const accounts = [
    { name: 'Linda Park', email: 'parent@demo.admitsonly.com', password: 'Parent@2026', role: 'parent' },
    { name: 'Marcus Thompson', email: 'tutor@demo.admitsonly.com', password: 'Tutor@2026', role: 'educator' },
  ];

  const results: string[] = [];

  for (const acct of accounts) {
    const exists = await prisma.user.findUnique({ where: { email: acct.email } });
    if (exists) {
      results.push(`${acct.name} (${acct.email}) already exists`);
    } else {
      await prisma.user.create({
        data: {
          name: acct.name,
          email: acct.email,
          password: await hash(acct.password, 12),
          role: acct.role,
        },
      });
      results.push(`${acct.name} (${acct.email}) created`);
    }
  }

  // Wire connections to Maya Johnson
  const student = await prisma.user.findUnique({ where: { email: 'maya@beta.admitsonly.com' } });
  const parent = await prisma.user.findUnique({ where: { email: 'parent@demo.admitsonly.com' } });
  const tutor = await prisma.user.findUnique({ where: { email: 'tutor@demo.admitsonly.com' } });

  if (student && parent && tutor) {
    // Connection code for Maya
    const existingCode: any[] = await prisma.$queryRaw`SELECT * FROM "connection_codes" WHERE "userId" = ${student.id}`;
    if (existingCode.length === 0) {
      await prisma.$executeRaw`INSERT INTO "connection_codes" ("id", "userId", "code") VALUES (${'cc_demo_maya'}, ${student.id}, ${'DEMO-MAYA'})`;
      results.push('Connection code DEMO-MAYA created for Maya');
    }

    // Parent → Maya
    const ep: any[] = await prisma.$queryRaw`SELECT * FROM "account_connections" WHERE "studentId" = ${student.id} AND "connectedUserId" = ${parent.id}`;
    if (ep.length === 0) {
      await prisma.$executeRaw`INSERT INTO "account_connections" ("id", "studentId", "connectedUserId", "role") VALUES (${'ac_demo_parent'}, ${student.id}, ${parent.id}, ${'parent'})`;
      results.push('Connected Linda Park → Maya Johnson (parent)');
    }

    // Tutor → Maya
    const et: any[] = await prisma.$queryRaw`SELECT * FROM "account_connections" WHERE "studentId" = ${student.id} AND "connectedUserId" = ${tutor.id}`;
    if (et.length === 0) {
      await prisma.$executeRaw`INSERT INTO "account_connections" ("id", "studentId", "connectedUserId", "role") VALUES (${'ac_demo_tutor'}, ${student.id}, ${tutor.id}, ${'tutor'})`;
      results.push('Connected Marcus Thompson → Maya Johnson (tutor)');
    }
  } else {
    results.push('Warning: Could not find all users for connection wiring');
  }

  return res.json({ ok: true, results });
}
