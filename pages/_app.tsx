import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Layout from '../components/Layout'
import { tracker } from '../lib/analytics'

// Pages that need auth (SessionProvider) and use their own layout
const authPrefixes = ['/dashboard', '/admin', '/auth/'];

export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();
  const needsAuth = authPrefixes.some((p) => router.pathname.startsWith(p));

  // Internal analytics — tracks page views, clicks, and session time
  useEffect(() => {
    tracker.init();
    const handleRoute = (url: string) => tracker.pageview(url);
    router.events.on('routeChangeComplete', handleRoute);
    return () => {
      router.events.off('routeChangeComplete', handleRoute);
      tracker.destroy();
    };
  }, [router.events]);

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
