import { NextRequest, NextResponse } from 'next/server';
import { serverBackendBase } from '@/lib/serverBackendBase';

export async function GET(
  _req: NextRequest,
  { params }: { params: { username: string } }
) {
  try {
    const { username } = params;
    if (!username) {
      return NextResponse.json({ error: 'Missing username' }, { status: 400 });
    }
    const res = await fetch(
      `${serverBackendBase()}/api/storefront/${encodeURIComponent(username)}`,
      { cache: 'no-store' }
    );
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (e) {
    console.error('[proxy] GET /api/storefront/[username]', e);
    return NextResponse.json(
      { error: 'Storefront proxy failed', detail: String(e) },
      { status: 502 }
    );
  }
}
