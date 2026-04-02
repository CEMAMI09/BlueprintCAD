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
    const res = await fetch(
      `${serverBackendBase()}/api/projects/${encodeURIComponent(id)}/download`,
      {
        headers: {
          ...(auth ? { Authorization: auth } : {}),
        },
        redirect: 'follow',
      }
    );

    const contentType =
      res.headers.get('content-type') || 'application/octet-stream';
    const buf = Buffer.from(await res.arrayBuffer());

    return new NextResponse(buf, {
      status: res.status,
      headers: {
        'Content-Type': contentType,
        ...(res.headers.get('content-disposition')
          ? {
              'Content-Disposition': res.headers.get(
                'content-disposition'
              ) as string,
            }
          : {}),
      },
    });
  } catch (e) {
    console.error('[proxy] GET /api/projects/[id]/download', e);
    return NextResponse.json(
      { error: 'Download proxy failed', detail: String(e) },
      { status: 502 }
    );
  }
}
