import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'

// Pages that need auth (SessionProvider) and use their own layout
const authPrefixes = ['/dashboard', '/admin', '/auth/'];

export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();
  const needsAuth = authPrefixes.some((p) => router.pathname.startsWith(p));

  // Public pages: no SessionProvider, wrapped in Layout
  if (!needsAuth) {
    return (
      <Layout>
        <Component {...pageProps} />
      </Layout>
    );
  }

  // Auth/dashboard/admin pages: SessionProvider, no Layout wrapper
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
