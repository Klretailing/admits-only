import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function ParentDebug() {
  const { data: session, status } = useSession();
  const [apiResult, setApiResult] = useState<string>('not fetched');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (status !== 'authenticated') return;
    fetch('/api/parent/overview')
      .then(r => r.text())
      .then(text => setApiResult(text))
      .catch(e => setError(e.message));
  }, [status]);

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', fontSize: 14 }}>
      <h1 style={{ fontSize: 20, marginBottom: 20 }}>Parent Debug Page</h1>
      <p><strong>Auth status:</strong> {status}</p>
      <p><strong>Session:</strong> {JSON.stringify(session, null, 2)}</p>
      <p><strong>User role:</strong> {(session?.user as any)?.role || 'none'}</p>
      <p><strong>User id:</strong> {(session?.user as any)?.id || 'none'}</p>
      <hr style={{ margin: '20px 0' }} />
      <p><strong>API /api/parent/overview result:</strong></p>
      <pre style={{ background: '#f1f5f9', padding: 16, borderRadius: 8, overflow: 'auto', maxHeight: 400 }}>
        {error ? `ERROR: ${error}` : apiResult}
      </pre>
    </div>
  );
}
