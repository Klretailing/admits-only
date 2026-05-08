import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export default function ParentDebug() {
  const [info, setInfo] = useState('Loading...');

  useEffect(() => {
    const lines: string[] = [];
    lines.push('Window loaded: ' + (typeof window !== 'undefined'));
    lines.push('URL: ' + window.location.href);

    fetch('/api/auth/session')
      .then(r => r.json())
      .then(session => {
        lines.push('Session: ' + JSON.stringify(session));
        lines.push('User: ' + (session?.user?.name || 'none'));
        lines.push('Role: ' + ((session?.user as any)?.role || 'none'));
        lines.push('ID: ' + ((session?.user as any)?.id || 'none'));

        return fetch('/api/parent/overview');
      })
      .then(r => r.text())
      .then(text => {
        lines.push('Overview API: ' + text.slice(0, 500));
        setInfo(lines.join('\n'));
      })
      .catch(e => {
        lines.push('Error: ' + e.message);
        setInfo(lines.join('\n'));
      });
  }, []);

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', fontSize: 13, whiteSpace: 'pre-wrap', background: '#fff', color: '#000', minHeight: '100vh' }}>
      <h1 style={{ fontSize: 18, marginBottom: 16 }}>Parent Debug</h1>
      <div>{info}</div>
    </div>
  );
}
