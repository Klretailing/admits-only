import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare, hash } from 'bcryptjs';
import { prisma, ensureSchema } from './db';

export type UserRole = 'student' | 'parent' | 'admin';

// Seed default accounts (admin + beta testers) — runs once per server start
let seeded = false;
async function seedAccounts() {
  if (seeded) return;
  seeded = true;

  try {
    const accounts = [
      { name: 'Admin', email: 'admin@admitsonly.com', password: 'Admin@2024', role: 'admin' },
      { name: 'Maya Johnson', email: 'maya@beta.admitsonly.com', password: 'Beta@2026', role: 'student' },
      { name: 'Aisha Patel', email: 'aisha@beta.admitsonly.com', password: 'Beta@2026', role: 'student' },
      { name: 'James Williams', email: 'james@beta.admitsonly.com', password: 'Beta@2026', role: 'student' },
      { name: 'Robert Chen', email: 'robert@beta.admitsonly.com', password: 'Beta@2026', role: 'parent' },
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
  } catch (e) {
    // Log but don't crash — allows login to proceed if users table exists
    console.error('Seed error (non-fatal):', (e as Error).message);
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
  session: { strategy: 'jwt' },
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

        await ensureSchema();
        await seedAccounts();

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });
        if (!user) return null;

        const valid = await compare(credentials.password, user.password);
        if (!valid) return null;

        return { id: user.id, name: user.name, email: user.email, role: user.role } as any;
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
