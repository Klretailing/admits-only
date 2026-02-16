import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { SessionProvider } from 'next-auth/react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'

// Pages that use their own layout (no global header/footer)
const noLayoutPrefixes = ['/dashboard', '/auth/'];

export default function MyApp({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  const router = useRouter();
  const skipLayout = noLayoutPrefixes.some((p) => router.pathname.startsWith(p));

  return (
    <SessionProvider session={session}>
      {skipLayout ? (
        <Component {...pageProps} />
      ) : (
        <Layout>
          <Component {...pageProps} />
        </Layout>
      )}
    </SessionProvider>
  )
}
