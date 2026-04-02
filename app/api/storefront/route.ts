import { NextRequest, NextResponse } from 'next/server';
import { serverBackendBase } from '@/lib/serverBackendBase';

export const runtime = 'nodejs';

/**
 * Proxies authenticated storefront CRUD to the Express API so the browser can use
 * same-origin `/api/storefront` (avoids CORS / wrong NEXT_PUBLIC_API_URL).
 */

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization');
    const res = await fetch(`${serverBackendBase()}/api/storefront`, {
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
    console.error('[proxy] GET /api/storefront', e);
    return NextResponse.json(
      { error: 'Storefront proxy failed', detail: String(e) },
      { status: 502 }
    );
  }
}

/** Forwards multipart save to Express using POST (avoids PUT issues on some hosts/proxies). */
async function proxySave(req: NextRequest) {
  const auth = req.headers.get('authorization');
  const ct = req.headers.get('content-type') || '';
  const buf = await req.arrayBuffer();
  const res = await fetch(`${serverBackendBase()}/api/storefront`, {
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
}

export async function POST(req: NextRequest) {
  try {
    return await proxySave(req);
  } catch (e) {
    console.error('[proxy] POST /api/storefront', e);
    return NextResponse.json(
      { error: 'Storefront save proxy failed', detail: String(e) },
      { status: 502 }
    );
  }
}

/** Legacy: same as POST. */
export async function PUT(req: NextRequest) {
  try {
    return await proxySave(req);
  } catch (e) {
    console.error('[proxy] PUT /api/storefront', e);
    return NextResponse.json(
      { error: 'Storefront save proxy failed', detail: String(e) },
      { status: 502 }
    );
  }
}
