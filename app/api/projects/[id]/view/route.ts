import { NextRequest, NextResponse } from 'next/server';
import { serverBackendBase } from '@/lib/serverBackendBase';

export const runtime = 'nodejs';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = req.headers.get('authorization');
    const id = params.id;
    const share = req.nextUrl.searchParams.get('share');
    const qs = share ? `?share=${encodeURIComponent(share)}` : '';
    const res = await fetch(
      `${serverBackendBase()}/api/projects/${encodeURIComponent(id)}/view${qs}`,
      {
        method: 'POST',
        headers: {
          ...(auth ? { Authorization: auth } : {}),
          'Content-Type': 'application/json',
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
    console.error('[proxy] POST /api/projects/[id]/view', e);
    return NextResponse.json(
      { error: 'Project view proxy failed', detail: String(e) },
      { status: 502 }
    );
  }
}
