import { NextRequest, NextResponse } from 'next/server';
import { serverBackendBase } from '@/lib/serverBackendBase';

export const runtime = 'nodejs';

/** Proxies multipart CAD upload to Express so local dev hits BACKEND_URL, not NEXT_PUBLIC_API_URL. */
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    const ct = req.headers.get('content-type') || '';
    const buf = await req.arrayBuffer();
    const res = await fetch(`${serverBackendBase()}/api/cad/upload`, {
      method: 'POST',
      headers: {
        ...(auth ? { Authorization: auth } : {}),
        ...(ct ? { 'Content-Type': ct } : {}),
      },
      body: buf,
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
      },
    });
  } catch (e) {
    console.error('[proxy] POST /api/cad/upload', e);
    return NextResponse.json(
      { error: 'CAD upload proxy failed', detail: String(e) },
      { status: 502 }
    );
  }
}
