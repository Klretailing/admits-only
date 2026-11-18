import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma, ensureSchema } from '../../../lib/db';
import { checkSignupAge, isMinor } from '../../../lib/age';

/* The signed-in user's age setting.
   GET → { birthMonth, minor }.
   PUT { dateOfBirth } → records it, but only if none is on file yet: once
   set it can only be corrected by contacting us, so a student can't edit
   their way out of the protections for under-18s. */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  const userId = (session?.user as any)?.id as string | undefined;
  if (!userId) return res.status(401).json({ error: 'Please sign in again.' });
  await ensureSchema();

  const rows: any[] = await prisma.$queryRaw`SELECT "role", "birthMonth" FROM "users" WHERE "id" = ${userId}`;
  const me = rows[0];
  if (!me) return res.status(401).json({ error: 'Please sign in again.' });

  if (req.method === 'GET') {
    return res.json({ birthMonth: me.birthMonth || null, minor: isMinor(me.role, me.birthMonth) });
  }

  if (req.method === 'PUT') {
    if (me.birthMonth) {
      return res.status(409).json({ error: 'Your date of birth is already on file. To correct it, email info@admitsonly.com.' });
    }
    const check = checkSignupAge(me.role, req.body?.dateOfBirth);
    if (!check.ok) {
      // An existing account whose owner turns out to be under 13: store
      // nothing more and ask a parent to contact us so we can delete it.
      if (check.code === 'under_13') {
        return res.status(403).json({
          code: 'under_13',
          error: 'AdmitsOnly is for students 13 and older. Please ask a parent or guardian to email info@admitsonly.com so we can close this account.',
        });
      }
      return res.status(check.status).json({ error: check.error, code: check.code });
    }
    await prisma.$executeRaw`UPDATE "users" SET "birthMonth" = ${check.birthMonth}, "updatedAt" = NOW() WHERE "id" = ${userId} AND "birthMonth" IS NULL`;
    return res.json({ birthMonth: check.birthMonth, minor: check.minor });
  }

  res.setHeader('Allow', ['GET', 'PUT']);
  return res.status(405).json({ error: 'Method not allowed' });
}
