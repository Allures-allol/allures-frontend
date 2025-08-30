// src/app/api/admin/users/[id]/route.ts
import { NextResponse } from 'next/server';

const UPSTREAM_BASE = 'https://api.alluresallol.com/auth/users';

function upstreamUrl(id: string | number) {
  // подстрахуемся с/без слеша
  return `${UPSTREAM_BASE}/${encodeURIComponent(String(id))}`;
}

function getAuthHeader() {
  const token =
    process.env.ADMIN_JWT ||
    // fallback — лучше держать в .env.local
    'super-secret-admin-token-b7f4a9186d2f4e5aa9c3d0f8e12a7c6b3d9f4a1e0b5c8d7e6f1a2b3c4d5e6f7a';
  return { authorization: `Bearer ${token}` };
}

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    // Next 15: params is a Promise
    const { id } = await ctx.params;

    // Pass-through optional ?force=true to upstream if provided
    const thisUrl = new URL(req.url);
    const force = thisUrl.searchParams.get('force');

    const upstream = new URL(upstreamUrl(id));
    if (force) upstream.searchParams.set('force', force);

    const res = await fetch(upstream.toString(), {
      method: 'DELETE',
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        ...getAuthHeader(),
      },
    });

    // Many APIs respond with 204 No Content on success
    if (res.status === 204) {
      return NextResponse.json({ ok: true }, { status: 200 });
    }

    const contentType = res.headers.get('content-type') || 'application/json';
    const text = await res.text();

    return new NextResponse(text || res.statusText, {
      status: res.ok ? 200 : res.status,
      headers: { 'content-type': contentType },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Delete proxy failed' },
      { status: 500 }
    );
  }
}