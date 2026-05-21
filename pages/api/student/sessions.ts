import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;
  const userEmail = session.user.email;

  try {
    // Find bookings for this student using two strategies:
    // 1) educator_students whose studentEmail matches the logged-in user's email
    // 2) educator_students whose educator is connected to this user via account_connections
    //
    // We use a raw query to join across these tables efficiently.
    const bookings: any[] = await prisma.$queryRaw`
      SELECT DISTINCT
        b."id",
        b."title",
        b."date",
        b."duration",
        b."status",
        b."meetingLink",
        b."platform",
        b."amount",
        b."paid",
        b."notes",
        b."createdAt",
        es."studentName",
        COALESCE(ep."headline", u."name") AS "educatorName",
        svc."name" AS "serviceName",
        svc."type" AS "serviceType"
      FROM "bookings" b
      JOIN "educator_students" es ON b."studentId" = es."id"
      JOIN "users" u ON b."educatorId" = u."id"
      LEFT JOIN "educator_profiles" ep ON ep."userId" = b."educatorId"
      LEFT JOIN "educator_services" svc ON b."serviceId" = svc."id"
      WHERE (
        LOWER(es."studentEmail") = LOWER(${userEmail})
        OR EXISTS (
          SELECT 1 FROM "account_connections" ac
          WHERE ac."studentId" = ${userId}
            AND ac."connectedUserId" = es."educatorId"
        )
      )
      ORDER BY b."date" DESC
    `;

    // Serialize dates to ISO strings for the frontend
    const serialized = bookings.map((b) => ({
      ...b,
      date: b.date instanceof Date ? b.date.toISOString() : b.date,
      createdAt: b.createdAt instanceof Date ? b.createdAt.toISOString() : b.createdAt,
    }));

    return res.json({ sessions: serialized });
  } catch (e) {
    console.error('Fetch student sessions error:', (e as Error).message);
    return res.json({ sessions: [] });
  }
}
