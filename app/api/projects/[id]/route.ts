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
    const share = req.nextUrl.searchParams.get('share');
    const qs = share ? `?share=${encodeURIComponent(share)}` : '';
    const res = await fetch(
      `${serverBackendBase()}/api/projects/${encodeURIComponent(id)}${qs}`,
      {
        headers: {
          ...(auth ? { Authorization: auth } : {}),
        },
        cache: 'no-store',
      }
    );
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (e) {
    console.error('[proxy] GET /api/projects/[id]', e);
    return NextResponse.json(
      { error: 'Project proxy failed', detail: String(e) },
      { status: 502 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = req.headers.get('authorization');
    const id = params.id;
    const res = await fetch(
      `${serverBackendBase()}/api/projects/${encodeURIComponent(id)}`,
      {
        method: 'DELETE',
        headers: {
          ...(auth ? { Authorization: auth } : {}),
        },
      }
    );
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (e) {
    console.error('[proxy] DELETE /api/projects/[id]', e);
    return NextResponse.json(
      { error: 'Project delete proxy failed', detail: String(e) },
      { status: 502 }
    );
  }
}
