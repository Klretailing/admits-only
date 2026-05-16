import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function CollegeMatchRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/dashboard/college-heatmap');
  }, [router]);
  return null;
}
