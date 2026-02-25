import type { NextApiRequest, NextApiResponse } from 'next';
import { prisma } from '../../lib/db';

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  const checks: Record<string, string> = {};

  // Check environment variables
  checks.POSTGRES_PRISMA_URL = process.env.POSTGRES_PRISMA_URL ? 'set' : 'MISSING';
  checks.DATABASE_URL = process.env.DATABASE_URL ? 'set' : 'not set';
  checks.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ? 'set' : 'not set (using fallback)';
  checks.NODE_ENV = process.env.NODE_ENV || 'undefined';

  // Test database connection
  try {
    const result = await prisma.$queryRawUnsafe('SELECT 1 as ok') as any[];
    checks.db_connection = 'OK';
  } catch (e) {
    checks.db_connection = `FAILED: ${(e as Error).message}`;
  }

  // Check if users table exists
  try {
    const count = await prisma.user.count();
    checks.users_table = `OK (${count} users)`;
  } catch (e) {
    checks.users_table = `FAILED: ${(e as Error).message}`;
  }

  // Check if student_profiles table exists
  try {
    const count = await prisma.studentProfile.count();
    checks.student_profiles_table = `OK (${count} profiles)`;
  } catch (e) {
    checks.student_profiles_table = `FAILED: ${(e as Error).message}`;
  }

  // Check if essays table exists
  try {
    const count = await prisma.essay.count();
    checks.essays_table = `OK (${count} essays)`;
  } catch (e) {
    checks.essays_table = `FAILED: ${(e as Error).message}`;
  }

  const allOk = checks.db_connection === 'OK' && checks.POSTGRES_PRISMA_URL === 'set';
  res.status(allOk ? 200 : 500).json({ status: allOk ? 'healthy' : 'unhealthy', checks });
}
