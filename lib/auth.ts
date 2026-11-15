import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare, hash } from 'bcryptjs';
import { createHash } from 'crypto';
import { prisma, ensureSchema } from './db';
import { seedDemoStudent } from './seedDemoStudent';

export type UserRole = 'student' | 'parent' | 'educator' | 'admin';

/* ─── Admin account ───
   The admin used to be created with a password written in this file, in a
   public repository, so anyone could sign in as admin. Now:
     • the admin password comes only from the ADMIN_PASSWORD environment
       variable (set it in Vercel → Settings → Environment Variables);
     • an admin whose stored password is still the old published one is
       rotated to ADMIN_PASSWORD on the next server start;
     • the old published password is refused for admin sign-in, always. */
const ADMIN_EMAIL = (process.env.ADMIN_EMAIL || 'admin@admitsonly.com').toLowerCase();
const LEAKED_ADMIN_PASSWORDS = ['Admin@2024'];

async function ensureAdminAccount() {
  const password = process.env.ADMIN_PASSWORD;
  const existing = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!existing) {
    if (password && password.length >= 12) {
      await prisma.user.create({ data: { name: 'Admin', email: ADMIN_EMAIL, password: await hash(password, 12), role: 'admin' } });
    }
    return;
  }
  if (!password || password.length < 12) return;
  for (const leaked of LEAKED_ADMIN_PASSWORDS) {
    if (await compare(leaked, existing.password)) {
      await prisma.user.update({ where: { id: existing.id }, data: { password: await hash(password, 12) } });
      console.warn('Admin password rotated from the published default to ADMIN_PASSWORD.');
      return;
    }
  }
}

/** The session signing key. Without NEXTAUTH_SECRET this used to fall back
 *  to a phrase that is public in this file, which lets anyone forge a
 *  session, including an admin one. The fallback is now derived from the
 *  database URL, which holds the database password and is never public.
 *  Set NEXTAUTH_SECRET anyway; it is the supported configuration. */
function sessionSecret(): string {
  if (process.env.NEXTAUTH_SECRET) return process.env.NEXTAUTH_SECRET;
  const basis = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
  if (!basis && process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_SECRET is not set');
  }
  return createHash('sha256').update(`admitsonly-session:${basis || 'local-dev'}`).digest('hex');
}

// Seed default accounts (admin + beta testers) — runs once per server start
let seeded = false;
async function seedAccounts() {
  if (seeded) return;
  seeded = true;

  try {
    await ensureSchema();

    const accounts = [
      { name: 'Maya Johnson', email: 'maya@beta.admitsonly.com', password: 'Beta@2026', role: 'student' },
      { name: 'Aisha Patel', email: 'aisha@beta.admitsonly.com', password: 'Beta@2026', role: 'student' },
      { name: 'James Williams', email: 'james@beta.admitsonly.com', password: 'Beta@2026', role: 'student' },
      { name: 'Robert Chen', email: 'robert@beta.admitsonly.com', password: 'Beta@2026', role: 'parent' },
      { name: 'Sarah Mitchell', email: 'demo.educator@admitsonly.com', password: 'Educator@2026', role: 'educator' },
      { name: 'Linda Park', email: 'parent@demo.admitsonly.com', password: 'Parent@2026', role: 'parent' },
      { name: 'Marcus Thompson', email: 'tutor@demo.admitsonly.com', password: 'Tutor@2026', role: 'educator' },
      { name: 'Test Tutor', email: 'testtutor@admitsonly.com', password: 'TestTutor@2026', role: 'educator' },
      // Fully-populated demo student + his Study Pod mates (see seedDemoStudent).
      { name: 'Ethan Nakamura', email: 'demo.student@admitsonly.com', password: 'Student@2026', role: 'student' },
      { name: 'Priya Sharma', email: 'priya@demo.admitsonly.com', password: 'Student@2026', role: 'student' },
      { name: 'Daniel Kim', email: 'daniel@demo.admitsonly.com', password: 'Student@2026', role: 'student' },
      { name: 'Sofia Alvarez', email: 'sofia@demo.admitsonly.com', password: 'Student@2026', role: 'student' },
    ];

    await ensureAdminAccount();

    for (const acct of accounts) {
      const exists = await prisma.user.findUnique({ where: { email: acct.email } });
      if (!exists) {
        await prisma.user.create({
          data: {
            name: acct.name,
            email: acct.email,
            password: await hash(acct.password, 12),
            role: acct.role,
          },
        });
      }
    }

    // Pre-wire demo connections: link parent & tutor accounts to Maya Johnson
    await seedDemoConnections();

    // Fully-populate the demo student's profile, tracker, pod, essays, Adam.
    await seedDemoStudent();
  } catch (e) {
    // Log but don't crash — allows login to proceed if users table exists
    console.error('Seed error (non-fatal):', (e as Error).message);
  }
}

async function seedDemoConnections() {
  try {
    // The parent and tutor demos follow Ethan, the fully-populated demo
    // student (see seedDemoStudent). They used to follow Maya, a beta account
    // with no applications, so both dashboards opened empty.
    const student = await prisma.user.findUnique({ where: { email: 'demo.student@admitsonly.com' } });
    const parent = await prisma.user.findUnique({ where: { email: 'parent@demo.admitsonly.com' } });
    const tutor = await prisma.user.findUnique({ where: { email: 'tutor@demo.admitsonly.com' } });
    const educator = await prisma.user.findUnique({ where: { email: 'demo.educator@admitsonly.com' } });
    if (!student) return;

    // Existing databases: move the old Maya links over to Ethan.
    await prisma.$executeRaw`
      UPDATE "account_connections" SET "studentId" = ${student.id}
      WHERE "id" IN ('ac_demo_parent', 'ac_demo_tutor') AND "studentId" <> ${student.id}`;

    const links: [string, { id: string } | null, string][] = [
      ['ac_demo_parent', parent, 'parent'],
      ['ac_demo_tutor', tutor, 'tutor'],
      ['ac_demo_educator', educator, 'tutor'],
    ];
    for (const [id, user, role] of links) {
      if (!user) continue;
      const existing: any[] = await prisma.$queryRaw`
        SELECT 1 FROM "account_connections" WHERE "studentId" = ${student.id} AND "connectedUserId" = ${user.id}`;
      if (existing.length === 0) {
        await prisma.$executeRaw`
          INSERT INTO "account_connections" ("id", "studentId", "connectedUserId", "role")
          VALUES (${id}, ${student.id}, ${user.id}, ${role})
          ON CONFLICT ("id") DO NOTHING`;
      }
    }

    // Ethan on each demo tutor's roster ("My Students"), already linked.
    for (const [rosterId, edu] of [['es_demo_ethan', educator], ['es_demo_ethan_t', tutor]] as const) {
      if (!edu) continue;
      await prisma.$executeRaw`
        INSERT INTO "educator_students" ("id", "educatorId", "studentName", "studentEmail", "tags", "status", "updatedAt", "inviteStatus", "linkedUserId")
        VALUES (${rosterId}, ${edu.id}, ${'Ethan Nakamura'}, ${'demo.student@admitsonly.com'}, ${'["Senior","CS"]'}::jsonb, ${'active'}, NOW(), ${'active'}, ${student.id})
        ON CONFLICT ("id") DO NOTHING`;
    }
  } catch (e) {
    console.error('Demo connections seed (non-fatal):', (e as Error).message);
  }
}

// Reset a specific user to fresh slate (wipe profile + essays)
export async function resetUserData(userId: string) {
  await prisma.studentProfile.deleteMany({ where: { userId } });
  await prisma.essay.deleteMany({ where: { userId } });
}

export async function getUsers() {
  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
  });
  return users;
}

export async function createUser(name: string, email: string, password: string, role: UserRole) {
  await seedAccounts();

  const exists = await prisma.user.findUnique({ where: { email } });
  if (exists) throw new Error('User already exists');

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password: await hash(password, 12),
      role,
    },
    select: { id: true, name: true, email: true, role: true },
  });

  return user;
}

export const authOptions: NextAuthOptions = {
  secret: sessionSecret(),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },  // 30 days
  pages: {
    signIn: '/auth/login',
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        try {
          await seedAccounts();

          const user = await prisma.user.findUnique({
            where: { email: credentials.email },
          });
          if (!user) return null;
          // The admin password that was published in this repository never
          // works again, whatever the database still holds.
          if (user.role === 'admin' && LEAKED_ADMIN_PASSWORDS.includes(credentials.password)) return null;

          const valid = await compare(credentials.password, user.password);
          if (!valid) return null;

          // Track last login time
          await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } }).catch(() => {});

          return { id: user.id, name: user.name, email: user.email, role: user.role } as any;
        } catch (e) {
          console.error('Auth error:', (e as Error).message);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
      }
      return session;
    },
  },
};
