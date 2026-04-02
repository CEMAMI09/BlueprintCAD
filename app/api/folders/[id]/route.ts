import { NextRequest, NextResponse } from 'next/server';
import { serverBackendBase } from '@/lib/serverBackendBase';

export const runtime = 'nodejs';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = req.headers.get('authorization');
    const id = params.id;
    const res = await fetch(`${serverBackendBase()}/api/folders/${encodeURIComponent(id)}`, {
      headers: {
        ...(auth ? { Authorization: auth } : {}),
      },
      cache: 'no-store',
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (e) {
    console.error('[proxy] GET /api/folders/[id]', e);
    return NextResponse.json(
      { error: 'Folder proxy failed', detail: String(e) },
      { status: 502 }
    );
  }
}
