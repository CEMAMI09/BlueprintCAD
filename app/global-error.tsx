// app/global-error.tsx
'use client';

export default function GlobalError({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <html>
      <body>
        <div style={{ padding: 40, textAlign: 'center' }}>
          <h1 style={{ fontSize: 32, color: '#e53e3e' }}>A global error occurred</h1>
          <p style={{ margin: '20px 0', color: '#aaa' }}>{error.message || 'An unexpected error occurred.'}</p>
          <button
            onClick={() => reset()}
            style={{
              background: '#3182ce',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              padding: '10px 24px',
              fontSize: 16,
              cursor: 'pointer',
              marginTop: 20,
            }}
          >
            Try Again
          </button>
        </div>
      </body>
    </html>
  );
}
