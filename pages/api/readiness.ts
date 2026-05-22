import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../lib/auth';
import { prisma, ensureSchema } from '../../lib/db';

interface ChecklistItem {
  id: string;
  label: string;
  complete: boolean;
  href: string;
  weight: number;
}

interface Nudge {
  id: string;
  message: string;
  action: string;
  href: string;
  type: 'info' | 'warning' | 'success';
}

interface ApplicationEntry {
  id: string;
  name: string;
  deadline: string;
  type: string;
  status: string;
  tasks: Array<{ id: string; label: string; done: boolean }>;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const session = await getServerSession(req, res, authOptions);
  if (!session?.user) return res.status(401).json({ error: 'Unauthorized' });

  await ensureSchema();
  const userId = (session.user as any).id as string;

  // Fetch all data in parallel
  const [profile, essays, applicationsRaw, podCountRaw] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId } }),
    prisma.essay.findMany({
      where: { userId },
      select: { id: true, status: true, title: true, overallScore: true, updatedAt: true },
    }),
    (async () => {
      try {
        const rows: Array<{ data: any }> = await prisma.$queryRaw`
          SELECT "data" FROM "saved_applications" WHERE "userId" = ${userId}
        `;
        const data = rows[0]?.data;
        return (Array.isArray(data) ? data : []) as ApplicationEntry[];
      } catch {
        return [] as ApplicationEntry[];
      }
    })(),
    (async () => {
      try {
        const rows: Array<{ count: any }> = await prisma.$queryRaw`
          SELECT COUNT(*) as count FROM "pod_members" WHERE "userId" = ${userId}
        `;
        return Number(rows[0]?.count ?? 0);
      } catch {
        return 0;
      }
    })(),
  ]);

  const applications = applicationsRaw;
  const podCount = podCountRaw;

  // Build readiness checklist
  const checklist: ChecklistItem[] = [
    {
      id: 'complete-profile',
      label: 'Complete your profile',
      complete: !!(profile && profile.gpa && (profile.satMath || (profile as any).actScore)),
      href: '/dashboard/profile',
      weight: 25,
    },
    {
      id: 'first-essay',
      label: 'Write your first essay',
      complete: essays.length > 0,
      href: '/dashboard/essays',
      weight: 20,
    },
    {
      id: 'add-schools',
      label: 'Add target schools',
      complete: applications.length > 0,
      href: '/dashboard/progress',
      weight: 20,
    },
    {
      id: 'essay-feedback',
      label: 'Get essay feedback',
      complete: essays.some((e) => (e.overallScore ?? 0) > 0),
      href: '/dashboard/essays',
      weight: 15,
    },
    {
      id: 'join-pod',
      label: 'Join a study pod',
      complete: podCount > 0,
      href: '/dashboard/pods',
      weight: 10,
    },
    {
      id: 'explore-matches',
      label: 'Explore college matches',
      complete: !!(profile && (profile as any).holisticScore),
      href: '/dashboard/college-heatmap',
      weight: 10,
    },
  ];

  // Calculate overall readiness score (0-100)
  const readiness = checklist.reduce((sum, item) => sum + (item.complete ? item.weight : 0), 0);

  // Generate smart nudges (max 3)
  const nudges: Nudge[] = [];
  const now = new Date();
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  const FOURTEEN_DAYS_MS = 14 * 24 * 60 * 60 * 1000;

  // Rule: No profile
  if (!profile) {
    nudges.push({
      id: 'setup-profile',
      message: 'Set up your profile to unlock college matching and your holistic score',
      action: 'Set up profile',
      href: '/dashboard/profile',
      type: 'info',
    });
  }

  // Rule: Profile exists but no essays
  if (nudges.length < 3 && profile && essays.length === 0) {
    nudges.push({
      id: 'start-essay',
      message: 'Start your first essay — colleges weigh personal statements heavily',
      action: 'Start writing',
      href: '/dashboard/essays',
      type: 'info',
    });
  }

  // Rule: Profile exists but no applications
  if (nudges.length < 3 && profile && applications.length === 0) {
    nudges.push({
      id: 'add-schools',
      message: 'Add your target schools to track deadlines and stay organized',
      action: 'Add schools',
      href: '/dashboard/progress',
      type: 'info',
    });
  }

  // Rule: Draft essays not touched in over a week
  if (nudges.length < 3) {
    const staleDrafts = essays.filter(
      (e) =>
        e.status === 'Draft' &&
        e.updatedAt &&
        now.getTime() - new Date(e.updatedAt).getTime() > SEVEN_DAYS_MS
    );
    if (staleDrafts.length > 0) {
      nudges.push({
        id: 'stale-drafts',
        message: "You have draft essays that haven't been touched in over a week",
        action: 'Review drafts',
        href: '/dashboard/essays',
        type: 'warning',
      });
    }
  }

  // Rule: Profile was recently updated — re-check matches
  if (nudges.length < 3 && profile && (profile as any).updatedAt) {
    nudges.push({
      id: 'recheck-matches',
      message: 'Your profile was updated — re-check your college matches for the latest fit scores',
      action: 'View matches',
      href: '/dashboard/college-heatmap',
      type: 'info',
    });
  }

  // Rule: Upcoming deadlines within 14 days
  if (nudges.length < 3) {
    const hasUpcoming = applications.some((app) => {
      try {
        const deadline = new Date(app.deadline);
        const diff = deadline.getTime() - now.getTime();
        return diff > 0 && diff <= FOURTEEN_DAYS_MS;
      } catch {
        return false;
      }
    });
    if (hasUpcoming) {
      nudges.push({
        id: 'upcoming-deadlines',
        message: 'You have upcoming deadlines — make sure your applications are on track',
        action: 'Check deadlines',
        href: '/dashboard/progress',
        type: 'warning',
      });
    }
  }

  // Rule: High readiness
  if (nudges.length < 3 && readiness >= 80) {
    nudges.push({
      id: 'great-progress',
      message: "Great progress! You're well-prepared for application season",
      action: 'View dashboard',
      href: '/dashboard',
      type: 'success',
    });
  }

  // Rule: High-scoring essay
  if (nudges.length < 3) {
    const topEssay = essays.find((e) => (e.overallScore ?? 0) >= 85);
    if (topEssay) {
      nudges.push({
        id: 'top-essay',
        message: `Your essay scored ${topEssay.overallScore}/100 — that's admissions-ready quality!`,
        action: 'View essay',
        href: '/dashboard/essays',
        type: 'success',
      });
    }
  }

  return res.json({ readiness, checklist, nudges: nudges.slice(0, 3) });
}
