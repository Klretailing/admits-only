import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../../lib/auth';
import { prisma } from '../../../lib/db';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user || (session.user as any).role !== 'educator') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const userId = (session.user as any).id;

  if (req.method === 'GET') {
    try {
      let profile = await prisma.educatorProfile.findUnique({ where: { userId } });
      if (!profile) {
        // Auto-create profile for educator on first visit
        profile = await prisma.educatorProfile.create({
          data: { userId },
        });
      }
      return res.json({
        profile: {
          bio: profile.bio,
          headline: profile.headline,
          credentials: profile.credentials as any[],
          subjects: profile.subjects as string[],
          hourlyRate: profile.hourlyRate,
          zoomLink: profile.zoomLink,
          googleMeetLink: profile.googleMeetLink,
          timezone: profile.timezone,
        },
      });
    } catch (e) {
      console.error('Fetch educator profile error:', (e as Error).message);
      return res.json({ profile: null });
    }
  }

  if (req.method === 'PUT') {
    const { bio, headline, credentials, subjects, hourlyRate, zoomLink, googleMeetLink, timezone } = req.body;

    try {
      const profile = await prisma.educatorProfile.upsert({
        where: { userId },
        update: {
          bio: bio ?? '',
          headline: headline ?? '',
          credentials: credentials ?? [],
          subjects: subjects ?? [],
          hourlyRate: hourlyRate ?? null,
          zoomLink: zoomLink ?? '',
          googleMeetLink: googleMeetLink ?? '',
          timezone: timezone ?? 'America/New_York',
        },
        create: {
          userId,
          bio: bio ?? '',
          headline: headline ?? '',
          credentials: credentials ?? [],
          subjects: subjects ?? [],
          hourlyRate: hourlyRate ?? null,
          zoomLink: zoomLink ?? '',
          googleMeetLink: googleMeetLink ?? '',
          timezone: timezone ?? 'America/New_York',
        },
      });
      return res.json({ profile });
    } catch (e) {
      console.error('Update educator profile error:', (e as Error).message);
      return res.status(500).json({ error: 'Failed to update profile' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
