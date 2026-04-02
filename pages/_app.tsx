import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import { useRouter } from 'next/router'
import { useEffect } from 'react'
import Layout from '../components/Layout'
import { tracker } from '../lib/analytics'
import { ThemeProvider } from '../lib/themeContext'

// Pages that use their own layout (no Layout wrapper)
const customLayoutPrefixes = ['/dashboard', '/educator', '/admin', '/auth/'];

export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();
  const usesCustomLayout = customLayoutPrefixes.some((p) => router.pathname.startsWith(p));

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

  // All pages get SessionProvider so auth state persists across navigation.
  // Only public pages get the Layout wrapper.
  if (!usesCustomLayout) {
    return (
      <ThemeProvider>
        <SessionProvider session={session}>
          <Layout>
            <Component {...pageProps} />
          </Layout>
        </SessionProvider>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <SessionProvider session={session}>
        <Component {...pageProps} />
      </SessionProvider>
    </ThemeProvider>
  );
}
