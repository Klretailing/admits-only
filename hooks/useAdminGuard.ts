import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
import { useEffect } from 'react';

export function useAdminGuard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    } else if (status === 'authenticated' && role !== 'admin') {
      router.push('/dashboard');
    }
  }, [status, role, router]);

  const loading = status === 'loading' || !session || role !== 'admin';
  return { session, loading };
}
