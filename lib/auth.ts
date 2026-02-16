import type { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare, hash } from 'bcryptjs';

// In-memory user store for demo — replace with a real database (Supabase, Prisma, etc.)
export interface StoredUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'student' | 'parent';
  createdAt: string;
}

// This is a demo store. In production, use a proper database.
const users: StoredUser[] = [];

export async function createUser(name: string, email: string, password: string, role: 'student' | 'parent') {
  const exists = users.find((u) => u.email === email);
  if (exists) throw new Error('User already exists');

  const hashed = await hash(password, 12);
  const user: StoredUser = {
    id: `user_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    name,
    email,
    password: hashed,
    role,
    createdAt: new Date().toISOString(),
  };
  users.push(user);
  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

export const authOptions: NextAuthOptions = {
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

        const user = users.find((u) => u.email === credentials.email);
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
