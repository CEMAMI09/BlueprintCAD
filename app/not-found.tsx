// app/not-found.tsx
'use client';

export default function NotFound() {
  return (
    <div style={{ padding: 40, textAlign: 'center' }}>
      <h1 style={{ fontSize: 32, color: '#e53e3e' }}>404 - Not Found</h1>
      <p style={{ margin: '20px 0', color: '#aaa' }}>The page you are looking for does not exist.</p>
      <a href="/" style={{
        background: '#3182ce',
        color: '#fff',
        border: 'none',
        borderRadius: 6,
        padding: '10px 24px',
        fontSize: 16,
        cursor: 'pointer',
        marginTop: 20,
        textDecoration: 'none',
        display: 'inline-block',
      }}>Go Home</a>
    </div>
  );
}
