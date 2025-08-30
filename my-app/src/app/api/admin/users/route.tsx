// src/app/api/admin/users/route.ts
import { NextResponse } from 'next/server';

const UPSTREAM = 'https://api.alluresallol.com/auth/users';

// Извлекаем элементы вне зависимости от того, как упакован ответ
function extractItems(json: any): any[] {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json?.items)) return json.items;
  if (Array.isArray(json?.results)) return json.results;
  if (Array.isArray(json?.data)) return json.data;
  if (Array.isArray(json?.users)) return json.users;
  if (Array.isArray(json?.results?.items)) return json.results.items;
  return [];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const all = searchParams.get('all') === '1';
  const limit = Number(searchParams.get('limit') ?? '100');
  const offset = Number(searchParams.get('offset') ?? '0');

  // Храним токен в .env.local (НЕ NEXT_PUBLIC)
  const token =
    process.env.ADMIN_JWT ||
    'super-secret-admin-token-b7f4a9186d2f4e5aa9c3d0f8e12a7c6b3d9f4a1e0b5c8d7e6f1a2b3c4d5e6f7a';

  const headers: Record<string, string> = {
    accept: 'application/json',
    authorization: `Bearer ${token}`,
  };

  try {
    if (!all) {
      const url = `${UPSTREAM}?limit=${encodeURIComponent(String(limit))}&offset=${encodeURIComponent(String(offset))}`;
      const res = await fetch(url, { headers, cache: 'no-store' });
      const text = await res.text();
      return new NextResponse(text, {
        status: res.status,
        headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
      });
    }

    // Сбор всех страниц
    const pageSize = limit > 0 ? limit : 100;
    let off = offset >= 0 ? offset : 0;
    const acc: any[] = [];
    let safety = 0;

    while (safety < 200) {
      const url = `${UPSTREAM}?limit=${pageSize}&offset=${off}`;
      const res = await fetch(url, { headers, cache: 'no-store' });
      if (!res.ok) {
        const txt = await res.text();
        return new NextResponse(txt || res.statusText, {
          status: res.status,
          headers: { 'content-type': res.headers.get('content-type') || 'application/json' },
        });
      }
      const json = await res.json();
      const items = extractItems(json);
      acc.push(...items);
      if (items.length < pageSize) break;
      off += pageSize;
      safety += 1;
    }

    return NextResponse.json(acc, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || 'Proxy failed' },
      { status: 500 }
    );
  }
}