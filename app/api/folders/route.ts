import { NextRequest, NextResponse } from 'next/server';
import { serverBackendBase } from '@/lib/serverBackendBase';

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    const res = await fetch(`${serverBackendBase()}/api/folders${req.nextUrl.search}`, {
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
    console.error('[proxy] GET /api/folders', e);
    return NextResponse.json(
      { error: 'Folders proxy failed', detail: String(e) },
      { status: 502 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    const body = await req.text();
    const res = await fetch(`${serverBackendBase()}/api/folders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(auth ? { Authorization: auth } : {}),
      },
      body,
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (e) {
    console.error('[proxy] POST /api/folders', e);
    return NextResponse.json(
      { error: 'Folders create proxy failed', detail: String(e) },
      { status: 502 }
    );
  }
}
