import { NextRequest, NextResponse } from 'next/server';
import { serverBackendBase } from '@/lib/serverBackendBase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    const search = req.nextUrl.search;
    const res = await fetch(`${serverBackendBase()}/api/projects${search}`, {
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
    console.error('[proxy] GET /api/projects', e);
    return NextResponse.json(
      { error: 'Projects proxy failed', detail: String(e) },
      { status: 502 }
    );
  }
}
