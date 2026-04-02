import { NextRequest, NextResponse } from 'next/server';
import { serverBackendBase } from '@/lib/serverBackendBase';

export const runtime = 'nodejs';

/**
 * Proxies thumbnail GET to Express/R2. `key` is one URL segment (often encodeURIComponent of full R2 key).
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { key: string } }
) {
  try {
    const key = params.key ? decodeURIComponent(params.key) : '';
    if (!key) {
      return NextResponse.json({ error: 'Missing key' }, { status: 400 });
    }
    const res = await fetch(
      `${serverBackendBase()}/api/thumbnails/${encodeURIComponent(key)}`,
      { cache: 'no-store' }
    );
    const ct = res.headers.get('content-type') || 'image/png';
    if (!res.ok) {
      const text = await res.text();
      return new NextResponse(text, {
        status: res.status,
        headers: { 'Content-Type': ct },
      });
    }
    const buf = await res.arrayBuffer();
    return new NextResponse(buf, {
      status: res.status,
      headers: {
        'Content-Type': ct,
        'Cache-Control': res.headers.get('cache-control') || 'public, max-age=31536000',
      },
    });
  } catch (e) {
    console.error('[proxy] GET /api/thumbnails/[key]', e);
    return NextResponse.json(
      { error: 'Thumbnail proxy failed', detail: String(e) },
      { status: 502 }
    );
  }
}
