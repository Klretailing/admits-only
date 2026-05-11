export default function ParentTest() {
  return (
    <div style={{ padding: 40, fontFamily: 'sans-serif' }}>
      <h1>Parent Test Page</h1>
      <p>If you can see this, the routing works.</p>
      <p>Current time: {new Date().toISOString()}</p>
      <p><a href="/parent">Go to Parent Dashboard</a></p>
      <p><a href="/parent/debug">Go to Debug Page</a></p>
      <p><a href="/dashboard">Go to Student Dashboard</a></p>
    </div>
  );
}
