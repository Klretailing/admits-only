import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare, hash } from 'bcryptjs';
import { prisma, ensureSchema } from './db';
import { seedDemoStudent } from './seedDemoStudent';

export type UserRole = 'student' | 'parent' | 'educator' | 'admin';

// Seed default accounts (admin + beta testers) — runs once per server start
let seeded = false;
async function seedAccounts() {
  if (seeded) return;
  seeded = true;

  try {
    await ensureSchema();

    const accounts = [
      { name: 'Admin', email: 'admin@admitsonly.com', password: 'Admin@2024', role: 'admin' },
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
    const student = await prisma.user.findUnique({ where: { email: 'maya@beta.admitsonly.com' } });
    const parent = await prisma.user.findUnique({ where: { email: 'parent@demo.admitsonly.com' } });
    const tutor = await prisma.user.findUnique({ where: { email: 'tutor@demo.admitsonly.com' } });
    if (!student || !parent || !tutor) return;

    // Create connection code for the student if missing
    const existingCode: any[] = await prisma.$queryRaw`SELECT * FROM "connection_codes" WHERE "userId" = ${student.id}`;
    if (existingCode.length === 0) {
      await prisma.$executeRaw`INSERT INTO "connection_codes" ("id", "userId", "code") VALUES (${`cc_demo_maya`}, ${student.id}, ${'DEMO-MAYA'})`;
    }

    // Connect parent → student
    const existingParent: any[] = await prisma.$queryRaw`SELECT * FROM "account_connections" WHERE "studentId" = ${student.id} AND "connectedUserId" = ${parent.id}`;
    if (existingParent.length === 0) {
      await prisma.$executeRaw`INSERT INTO "account_connections" ("id", "studentId", "connectedUserId", "role") VALUES (${`ac_demo_parent`}, ${student.id}, ${parent.id}, ${'parent'})`;
    }

    // Connect tutor → student
    const existingTutor: any[] = await prisma.$queryRaw`SELECT * FROM "account_connections" WHERE "studentId" = ${student.id} AND "connectedUserId" = ${tutor.id}`;
    if (existingTutor.length === 0) {
      await prisma.$executeRaw`INSERT INTO "account_connections" ("id", "studentId", "connectedUserId", "role") VALUES (${`ac_demo_tutor`}, ${student.id}, ${tutor.id}, ${'tutor'})`;
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
  secret: process.env.NEXTAUTH_SECRET || 'dev-secret-change-in-production',
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
