import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { prisma } from '../../lib/db';
import { authOptions } from '../../lib/auth';

/* Health check. Anyone (an uptime monitor, say) gets a bare up/down. Only a
   signed-in admin sees the detail: it used to show everyone the database
   error text, user counts, and whether the session secret was missing. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const checks: Record<string, string> = {};
  checks.POSTGRES_PRISMA_URL = process.env.POSTGRES_PRISMA_URL ? 'set' : 'MISSING';
  checks.DATABASE_URL = process.env.DATABASE_URL ? 'set' : 'not set';
  checks.NEXTAUTH_SECRET = process.env.NEXTAUTH_SECRET ? 'set' : 'not set';
  checks.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ? 'set' : 'not set';
  checks.CRON_SECRET = process.env.CRON_SECRET ? 'set' : 'not set';
  checks.RESEND_API_KEY = process.env.RESEND_API_KEY ? 'set' : 'not set';
  checks.NODE_ENV = process.env.NODE_ENV || 'undefined';

  let dbOk = false;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbOk = true;
    checks.db_connection = 'OK';
    checks.users = String(await prisma.user.count());
    checks.essays = String(await prisma.essay.count());
  } catch (e) {
    checks.db_connection = `FAILED: ${(e as Error).message}`;
  }

  const status = dbOk ? 200 : 503;
  const session = await getServerSession(req, res, authOptions).catch(() => null);
  if ((session?.user as any)?.role === 'admin') {
    return res.status(status).json({ status: dbOk ? 'healthy' : 'unhealthy', checks });
  }
  return res.status(status).json({ status: dbOk ? 'healthy' : 'unhealthy' });
}
