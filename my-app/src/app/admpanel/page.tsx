'use client';

import * as React from 'react';
import {
  Box,
  Tabs,
  Tab,
  Paper,
  Stack,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Checkbox,
  FormControlLabel,
  NoSsr,
  IconButton,
  Autocomplete,
} from '@mui/material';
import DeleteForeverOutlinedIcon from '@mui/icons-material/DeleteForeverOutlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';

type Role = 'admin' | 'manager' | 'customer' | 'guest' | 'user' | (string & {});

export type UserRow = {
  id: string | number;
  login?: string;
  full_name?: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  language?: string;
  bonus_balance?: number;
  delivery_address?: string;
  registered_at?: string;
  role: Role;
  is_blocked?: boolean;
  created_at?: string;
};

export type PaymentRow = {
  id: string | number;
  user: string;
  amount: number;
  currency?: string;
  status: 'paid' | 'pending' | 'failed' | 'refunded';
  created_at?: string;
};

export type ProductRow = {
  id: number | string;
  company_id?: number;
  name: string;
  description?: string;
  price: number;
  status?: string;
  current_inventory?: number;
  category_id?: number | string;
  category_name?: string;
  old_price?: number;
  image?: string;
  subcategory?: string;
  product_type?: string;
  is_hit?: boolean;
  is_discount?: boolean;
  is_new?: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ReviewRow = {
  id: string | number;
  product: string;
  user: string;
  rating: number;
  comment?: string;
  created_at?: string;
};

// Reviews returned by /review/product/:id
export type ProductReview = {
  id: number | string;
  product_id: number | string;
  user_id: number | string;
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative' | (string & {});
  pos_score: number;
  neg_score: number;
  created_at?: string;
  // Backend review status (editable)
  status?: 'PENDING' | 'REJECTED' | 'APPROVED';
};
const REVIEW_STATUSES = ['PENDING', 'REJECTED', 'APPROVED'] as const;

const normalizeReviewStatus = (v: unknown): 'PENDING' | 'REJECTED' | 'APPROVED' => {
  const s = String(v ?? '').toUpperCase();
  if (s === 'APPROVED') return 'APPROVED';
  if (s === 'REJECTED') return 'REJECTED';
  return 'PENDING';
};

export type CategoryOption = { id: number | string; name: string };
export type CategoryRow = {
  id: string | number;
  name?: string;
  description?: string;
  slug?: string;
  parent_id?: string | number | null;
  created_at?: string;
  updated_at?: string;
  // Доп. поля для редактирования
  category_id?: number;
  category_name?: string;
  subcategory?: string;
  product_type?: string;
};

const fmtUA = (n: unknown) => {
  const num = typeof n === 'string' ? Number(n) : (n as number);
  return Number.isFinite(num) ? (num as number).toLocaleString('uk-UA') : '—';
};
const imgSrc = (src?: string | null) => (!src ? '/placeholder.png' : src.startsWith('http') ? src : `https://api.alluresallol.com${src.startsWith('/') ? '' : '/'}${src}`);
const cmpId = (a: string | number, b: string | number) => {
  const na = Number(a);
  const nb = Number(b);
  if (Number.isFinite(na) && Number.isFinite(nb)) return (na as number) - (nb as number);
  return String(a).localeCompare(String(b), 'uk');
};

// ---- API: редактирование категории ----
type CategoryEditPayload = {
  category_id?: number;
  category_name?: string;
  description?: string;
  subcategory?: string;
  product_type?: string;
};

async function updateCategory(
  id: number | string,
  payload: CategoryEditPayload
): Promise<CategoryRow> {
  const base = 'https://api.alluresallol.com/product/categories/';
  const body: any = {
    category_id: payload.category_id,
    category_name: payload.category_name,
    description: payload.description,
    subcategory: payload.subcategory,
    product_type: payload.product_type,
  };
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

  const attempts = [
    { method: 'PATCH', url: `${base}${id}` },
    { method: 'PATCH', url: `${base}${id}/` },
    { method: 'PUT', url: `${base}${id}` },
    { method: 'PUT', url: `${base}${id}/` },
  ] as const;

  let lastErr: any = null;
  for (const a of attempts) {
    try {
      const res = await fetch(a.url, {
        method: a.method,
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { lastErr = new Error(`${a.method} ${res.status}`); continue; }
      const c = await res.json();
      return {
        id: c.id ?? c.category_id ?? id,
        name: c.name ?? c.category_name ?? body.category_name ?? '',
        description: c.description ?? body.description ?? '',
        subcategory: c.subcategory ?? body.subcategory,
        product_type: c.product_type ?? body.product_type,
        category_id: c.category_id ?? (typeof id === 'number' ? id : Number(id)),
        category_name: c.category_name ?? c.name ?? body.category_name,
        updated_at: c.updated_at ?? c.modified_at ?? undefined,
        created_at: c.created_at ?? undefined,
      };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Update category failed');
}

// ---- API: створення категорії ----
async function createCategory(payload: CategoryEditPayload): Promise<CategoryRow> {
  const base = 'https://api.alluresallol.com/product/categories';
  const body: any = {
    category_id: payload.category_id,
    category_name: payload.category_name,
    description: payload.description,
    subcategory: payload.subcategory,
    product_type: payload.product_type,
  };
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

  const attempts = [
    { method: 'POST', url: `${base}` },
    { method: 'POST', url: `${base}/` },
  ] as const;

  let lastErr: any = null;
  for (const a of attempts) {
    try {
      const res = await fetch(a.url, {
        method: a.method,
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { lastErr = new Error(`${a.method} ${res.status}`); continue; }
      const c = await res.json();
      return {
        id: c.id ?? c.category_id ?? body.category_id ?? '',
        name: c.name ?? c.category_name ?? body.category_name ?? '',
        description: c.description ?? body.description ?? '',
        subcategory: c.subcategory ?? body.subcategory,
        product_type: c.product_type ?? body.product_type,
        category_id: c.category_id ?? body.category_id,
        category_name: c.category_name ?? c.name ?? body.category_name,
        updated_at: c.updated_at ?? c.modified_at ?? undefined,
        created_at: c.created_at ?? undefined,
      };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Create category failed');
}

// ---- helper: ensure category by name (find or create) ----
async function ensureCategoryByName(
  nameRaw: string,
  setCatsState?: React.Dispatch<React.SetStateAction<CategoryOption[]>>
): Promise<CategoryOption> {
  const name = nameRaw.trim();
  if (!name) throw new Error('Порожня назва категорії');
  // try to find in current list
  const existing = (window as any)?.__cats_cache__ as CategoryOption[] | undefined;
  const fromState = Array.isArray(existing) ? existing : [];
  let found = fromState.find((c) => c.name.toLowerCase() === name.toLowerCase());
  if (found) return found;

  // create on backend
  const created = await createCategory({ category_name: name });
  const option: CategoryOption = {
    id: created.id ?? created.category_id ?? name,
    name: created.name || created.category_name || name,
  };
  // update outer state if provided
  if (setCatsState) {
    setCatsState((prev) => {
      const arr = [{ id: option.id, name: option.name }, ...prev];
      try { (window as any).__cats_cache__ = arr; } catch {}
      return arr;
    });
  } else {
    try {
      const prev: CategoryOption[] = Array.isArray((window as any).__cats_cache__) ? (window as any).__cats_cache__ : [];
      (window as any).__cats_cache__ = [{ id: option.id, name: option.name }, ...prev];
    } catch {}
  }
  return option;
}

// ---- API: видалення категорії ----
async function deleteCategory(id: number | string, force: boolean = false): Promise<void> {
  const base = 'https://api.alluresallol.com/product/categories/';
  const qs = `?force=${force ? 'true' : 'false'}`;
  const attempts = [
    `${base}${id}${qs}`,
    `${base}${id}/${qs}`,
  ];
  let lastErr: any = null;
  for (const url of attempts) {
    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { accept: 'application/json' },
      });
      if (res.ok) return;
      lastErr = new Error(`DELETE ${res.status}`);
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Delete category failed');
}

// ---- DEMO fallbacks ----
const demoUsers: UserRow[] = Array.from({ length: 12 }).map((_, i) => ({
  id: i + 1,
  name: `Користувач ${i + 1}`,
  email: `user${i + 1}@example.com`,
  role: (['admin', 'manager', 'customer'] as Role[])[i % 3],
  created_at: new Date(Date.now() - i * 86400000).toISOString(),
}));
const demoPayments: PaymentRow[] = Array.from({ length: 8 }).map((_, i) => ({
  id: 1000 + i,
  user: demoUsers[i % demoUsers.length].name,
  amount: 1999 * (1 + (i % 3)),
  currency: 'UAH',
  status: (['paid', 'pending', 'failed'] as const)[i % 3],
  created_at: new Date(Date.now() - i * 43200000).toISOString(),
}));
const demoReviews: ReviewRow[] = Array.from({ length: 10 }).map((_, i) => ({
  id: 500 + i,
  product: `Товар №${i + 1}`,
  user: demoUsers[i % demoUsers.length].name,
  rating: (i % 5) + 1,
  comment: 'Все супер! Рекомендую 👍',
  created_at: new Date(Date.now() - i * 7200000).toISOString(),
}));

// ---- API helpers ----
const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_API_BASE || '';

async function fetchUsers(role?: Role): Promise<UserRow[]> {
  // target upstream: https://api.alluresallol.com/auth/all?limit=100&offset=0
  // we still prefer going through a server proxy first to avoid exposing tokens.
  try {
    const params = new URLSearchParams({
      limit: '100',
      offset: '0',
    });
    if (role && role !== 'all') params.set('role', String(role));

    // Try proxy endpoints (any of these may exist in your project):
    const candidateUrls = [
      `/api/admin/users?${params.toString()}`,            // old proxy
      `/api/admin/auth-all?${params.toString()}`,         // proxy that targets /auth/all
      `/api/admin/users-all?${params.toString()}`,        // another common alias
    ];

    for (const url of candidateUrls) {
      try {
        const res = await fetch(url, {
          cache: 'no-store',
          headers: { accept: 'application/json' },
        });
        if (!res.ok) continue;
        const json = await res.json();

        const items: any[] = Array.isArray(json)
          ? json
          : Array.isArray(json?.items)
          ? json.items
          : Array.isArray(json?.results)
          ? json.results
          : Array.isArray(json?.data)
          ? json.data
          : Array.isArray(json?.users)
          ? json.users
          : Array.isArray(json?.results?.items)
          ? json.results.items
          : [];

        if (items.length === 0) continue;

        const mapped: UserRow[] = items.map((u: any, idx: number) => {
          const fullName =
            u.full_name ||
            [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
          const displayName =
            u.name || fullName || u.username || u.login || u.email || `Користувач ${idx + 1}`;
          const roleRaw = String(u.role ?? u.user_role ?? 'user').toLowerCase() as Role;

          return {
            id: u.id ?? u.user_id ?? idx,
            login: u.login ?? u.username ?? '',
            full_name: fullName || undefined,
            name: String(displayName),
            email: String(u.email || '—'),
            phone: u.phone ?? u.phone_number ?? '',
            avatar_url: u.avatar_url ?? u.avatar ?? '',
            language: u.language ?? u.lang ?? 'uk',
            bonus_balance:
              typeof u.bonus_balance === 'number'
                ? u.bonus_balance
                : Number(u.bonus_balance ?? 0) || 0,
            delivery_address: u.delivery_address ?? u.address ?? '',
            registered_at:
              u.registered_at || u.date_joined || u.created_at || u.createdAt || undefined,
            role: roleRaw || 'user',
            is_blocked: Boolean(u.is_blocked ?? u.blocked ?? false),
            created_at: u.created_at || u.createdAt || undefined,
          } as UserRow;
        });

        return role && role !== 'all'
          ? mapped.filter((r) => String(r.role) === String(role))
          : mapped;
      } catch {
        // try next candidate
      }
    }

    // FINAL FALLBACK: call upstream directly (optionally with a *public* token if provided)
    // WARNING: Do not put secret tokens into NEXT_PUBLIC_* in production.
    const upstream = new URL('https://api.alluresallol.com/auth/all');
    upstream.search = params.toString();

    const publicBearer = process.env.NEXT_PUBLIC_SERVICE_ADMIN_JWT?.trim();
    const upstreamRes = await fetch(upstream.toString(), {
      cache: 'no-store',
      headers: {
        accept: 'application/json',
        ...(publicBearer ? { Authorization: `Bearer ${publicBearer}` } : {}),
      },
    });

    if (!upstreamRes.ok) {
      // fall back to demo users if upstream fails
      throw new Error(`Upstream ${upstreamRes.status}`);
    }

    const upstreamJson = await upstreamRes.json();
    const upstreamItems: any[] = Array.isArray(upstreamJson)
      ? upstreamJson
      : Array.isArray(upstreamJson?.items)
      ? upstreamJson.items
      : Array.isArray(upstreamJson?.results)
      ? upstreamJson.results
      : Array.isArray(upstreamJson?.data)
      ? upstreamJson.data
      : Array.isArray(upstreamJson?.users)
      ? upstreamJson.users
      : Array.isArray(upstreamJson?.results?.items)
      ? upstreamJson.results.items
      : [];

    const mappedFallback: UserRow[] = upstreamItems.map((u: any, idx: number) => {
      const fullName =
        u.full_name ||
        [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
      const displayName =
        u.name || fullName || u.username || u.login || u.email || `Користувач ${idx + 1}`;
      const roleRaw = String(u.role ?? u.user_role ?? 'user').toLowerCase() as Role;

      return {
        id: u.id ?? u.user_id ?? idx,
        login: u.login ?? u.username ?? '',
        full_name: fullName || undefined,
        name: String(displayName),
        email: String(u.email || '—'),
        phone: u.phone ?? u.phone_number ?? '',
        avatar_url: u.avatar_url ?? u.avatar ?? '',
        language: u.language ?? u.lang ?? 'uk',
        bonus_balance:
          typeof u.bonus_balance === 'number'
            ? u.bonus_balance
            : Number(u.bonus_balance ?? 0) || 0,
        delivery_address: u.delivery_address ?? u.address ?? '',
        registered_at:
          u.registered_at || u.date_joined || u.created_at || u.createdAt || undefined,
        role: roleRaw || 'user',
        is_blocked: Boolean(u.is_blocked ?? u.blocked ?? false),
        created_at: u.created_at || u.createdAt || undefined,
      } as UserRow;
    });

    return role && role !== 'all'
      ? mappedFallback.filter((r) => String(r.role) === String(role))
      : mappedFallback;
  } catch (e) {
    console.warn('Users proxy/upstream error, fallback to demo:', e);
    return demoUsers.filter((u) => !role || role === 'all' || String(u.role) === String(role));
  }
}

async function fetchPayments(): Promise<PaymentRow[]> {
  try {
    if (!ADMIN_BASE) return demoPayments;
    const url = new URL(`${ADMIN_BASE.replace(/\/$/, '')}/payments`);
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`Payments ${res.status}`);
    const json = await res.json();
    const items: any[] = Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : (json?.results ?? []);
    return items.map((x, i) => ({
      id: x.id ?? i,
      user: x.user?.name ?? x.user_name ?? '—',
      amount: Number(x.amount ?? 0),
      currency: x.currency ?? 'UAH',
      status: (x.status as PaymentRow['status']) ?? 'paid',
      created_at: x.created_at ?? x.createdAt ?? undefined,
    }));
  } catch (e) {
    console.warn('Payments fallback due to error:', e);
    return demoPayments;
  }
}

async function fetchProducts(): Promise<ProductRow[]> {
  try {
    const qs = `limit=1000&offset=0&sort=-id`;
    const endpoints = [
      // ✅ Требование: сначала пробуем корневой эндпоинт
      `https://api.alluresallol.com/product/`,
      `https://api.alluresallol.com/product`,
      // Дальше — типовые листинги
      `https://api.alluresallol.com/product/products?${qs}`,
      `https://api.alluresallol.com/product/products/?${qs}`,
      // Фолбэк на старый all
      `https://api.alluresallol.com/product/all`,
    ];

    const tryFetch = async (url: string) => {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 12000);
        const res = await fetch(url, { cache: 'no-store', headers: { accept: 'application/json' }, signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) return null;
        return await res.json();
      } catch {
        return null;
      }
    };

    let data: any = null;
    for (const u of endpoints) {
      const json = await tryFetch(u);
      if (json) { data = json; break; }
    }
    if (!data) return [];

    // Универсальная вытяжка массива товаров из разных структур ответа
    const list: any[] = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data?.products)
      ? data.products
      : Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.results?.items)
      ? data.results.items
      : Array.isArray(data)
      ? data
      : [];

    return (list || []).map((p: any) => ({
      id: p.id,
      company_id: p.company_id,
      name: String(p.name ?? ''),
      description: typeof p.description === 'string' ? p.description : undefined,
      price: Number(p.price ?? 0),
      status: p.status ?? undefined,
      current_inventory: typeof p.current_inventory === 'number' ? p.current_inventory : Number(p.current_inventory ?? 0) || undefined,
      category_id: p.category_id ?? undefined,
      category_name: p.category_name ?? undefined,
      old_price: typeof p.old_price === 'number' ? p.old_price : Number(p.old_price ?? 0) || undefined,
      image: typeof p.image === 'string' ? p.image : undefined,
      subcategory: p.subcategory ?? undefined,
      product_type: p.product_type ?? undefined,
      is_hit: Boolean(p.is_hit),
      is_discount: Boolean(p.is_discount),
      is_new: Boolean(p.is_new),
      created_at: p.created_at ?? undefined,
      updated_at: p.updated_at ?? undefined,
    }));
  } catch (e) {
    console.warn('Products error:', e);
    return [];
  }
}

async function fetchReviews(): Promise<ReviewRow[]> {
  try {
    if (!ADMIN_BASE) return demoReviews;
    const url = new URL(`${ADMIN_BASE.replace(/\/$/, '')}/reviews`);
    const res = await fetch(url.toString(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`Reviews ${res.status}`);
    const json = await res.json();
    const items: any[] = Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : (json?.results ?? []);
    return items.map((x, i) => ({
      id: x.id ?? i,
      product: x.product?.name ?? x.product_name ?? '—',
      user: x.user?.name ?? x.user_name ?? '—',
      rating: Number(x.rating ?? 0),
      comment: x.comment ?? '',
      created_at: x.created_at ?? x.createdAt ?? undefined,
    }));
  } catch (e) {
    console.warn('Reviews fallback due to error:', e);
    return demoReviews;
  }
}

async function fetchReviewsByProduct(productId: number | string): Promise<ProductReview[]> {
  try {
    const url = `https://api.alluresallol.com/review/product/${productId}`;
    const res = await fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } });
    if (!res.ok) throw new Error(`Product reviews ${res.status}`);
    const json = await res.json();
    const items: any[] = Array.isArray(json) ? json : Array.isArray(json?.items) ? json.items : (json ? [json] : []);
    return items.map((r: any) => ({
      id: r.id,
      product_id: r.product_id ?? productId,
      user_id: r.user_id ?? '—',
      text: r.text ?? '',
      sentiment: r.sentiment ?? 'neutral',
      pos_score: Number(r.pos_score ?? 0),
      neg_score: Number(r.neg_score ?? 0),
      created_at: r.created_at ?? undefined,
      status: normalizeReviewStatus(r.status ?? r.review_status),
    }));
  } catch (e) {
    console.warn('fetchReviewsByProduct error:', e);
    return [];
  }
}

async function updateReviewStatus(reviewId: number | string, status: string): Promise<void> {
  status = normalizeReviewStatus(status);
  const enc = encodeURIComponent(String(status).toUpperCase());
  const base = `https://api.alluresallol.com/review/update-status/${reviewId}`;
  const attempts = [
    { method: 'POST', url: `${base}?status=${enc}` },
    { method: 'PATCH', url: `${base}?status=${enc}` },
    { method: 'PUT', url: `${base}?status=${enc}` },
    { method: 'GET', url: `${base}?status=${enc}` },
  ] as const;
  let lastErr: any = null;
  for (const a of attempts) {
    try {
      const res = await fetch(a.url, { method: a.method, cache: 'no-store', headers: { accept: 'application/json' } });
      if (res.ok) return; // success
      lastErr = new Error(`${a.method} ${res.status}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Update review status failed');
}

async function fetchCategoriesAll(): Promise<CategoryOption[]> {
  try {
    const base = 'https://api.alluresallol.com/product/products/categories';
    const limit = 100;
    let offset = 0;
    const out: CategoryOption[] = [];
    for (let page = 0; page < 200; page += 1) {
      const url = `${base}?limit=${limit}&offset=${offset}`;
      const res = await fetch(url, { cache: 'no-store', headers: { accept: 'application/json' } });
      if (!res.ok) break;
      const json = await res.json();
      const items: any[] = Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : (json?.results ?? []);
      out.push(
        ...items
          .map((c: any) => ({ id: c.id ?? c.category_id ?? c.slug ?? '', name: c.name ?? c.title ?? c.label ?? '' }))
          .filter((c: CategoryOption) => c.id !== '' && c.name)
      );
      if (items.length < limit) break;
      offset += limit;
    }
    const seen = new Set<string>();
    const dedup = out.filter((c) => {
      const key = String(c.id);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return dedup.sort((a, b) => a.name.localeCompare(b.name, 'uk'));
  } catch (e) {
    console.warn('fetchCategoriesAll error', e);
    return [];
  }
}

async function loadProductById(id: number | string): Promise<ProductRow | null> {
  const pid = String(id);

  const endpoints = [
    `https://api.alluresallol.com/product/${pid}`,
    `https://api.alluresallol.com/product/${pid}/`,
    `https://api.alluresallol.com/product/products/${pid}`,
    `https://api.alluresallol.com/product/products/${pid}/`,
    `https://api.alluresallol.com/product?id=${encodeURIComponent(pid)}`,
  ];

  const tryFetch = async (url: string): Promise<any | null> => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(url, { cache: 'no-store', headers: { accept: 'application/json' }, signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  // 1) Try direct item endpoints first
  for (const u of endpoints) {
    const data = await tryFetch(u);
    if (!data) continue;

    const directObj = (!Array.isArray(data) && typeof data === 'object') ? data : null;
    if (directObj && (directObj.id !== undefined || directObj.name !== undefined)) {
      const p = directObj as any;
      return {
        id: p.id ?? id,
        company_id: p.company_id,
        name: String(p.name ?? ''),
        description: typeof p.description === 'string' ? p.description : undefined,
        price: Number(p.price ?? 0),
        status: p.status ?? undefined,
        current_inventory: typeof p.current_inventory === 'number' ? p.current_inventory : Number(p.current_inventory ?? 0) || undefined,
        category_id: p.category_id ?? undefined,
        category_name: p.category_name ?? undefined,
        old_price: typeof p.old_price === 'number' ? p.old_price : Number(p.old_price ?? 0) || undefined,
        image: typeof p.image === 'string' ? p.image : undefined,
        subcategory: p.subcategory ?? undefined,
        product_type: p.product_type ?? undefined,
        is_hit: Boolean(p.is_hit),
        is_discount: Boolean(p.is_discount),
        is_new: Boolean(p.is_new),
        created_at: p.created_at ?? undefined,
        updated_at: p.updated_at ?? undefined,
      } as ProductRow;
    }

    const arr: any[] = Array.isArray((data as any)?.items)
      ? (data as any).items
      : Array.isArray((data as any)?.results)
      ? (data as any).results
      : Array.isArray((data as any)?.products)
      ? (data as any).products
      : Array.isArray((data as any)?.data)
      ? (data as any).data
      : Array.isArray(data)
      ? (data as any)
      : [];

    if (arr.length) {
      const hit = arr.find((x: any) => String(x?.id) === pid) || arr.find((x: any) => Number(x?.id) === Number(pid));
      if (hit) {
        const p = hit as any;
        return {
          id: p.id ?? id,
          company_id: p.company_id,
          name: String(p.name ?? ''),
          description: typeof p.description === 'string' ? p.description : undefined,
          price: Number(p.price ?? 0),
          status: p.status ?? undefined,
          current_inventory: typeof p.current_inventory === 'number' ? p.current_inventory : Number(p.current_inventory ?? 0) || undefined,
          category_id: p.category_id ?? undefined,
          category_name: p.category_name ?? undefined,
          old_price: typeof p.old_price === 'number' ? p.old_price : Number(p.old_price ?? 0) || undefined,
          image: typeof p.image === 'string' ? p.image : undefined,
          subcategory: p.subcategory ?? undefined,
          product_type: p.product_type ?? undefined,
          is_hit: Boolean(p.is_hit),
          is_discount: Boolean(p.is_discount),
          is_new: Boolean(p.is_new),
          created_at: p.created_at ?? undefined,
          updated_at: p.updated_at ?? undefined,
        } as ProductRow;
      }
    }
  }

  // 2) Fallback: list endpoints, then find item locally
  const qs = `limit=1000&offset=0&sort=-id`;
  const listEndpoints = [
    `https://api.alluresallol.com/product/`,
    `https://api.alluresallol.com/product`,
    `https://api.alluresallol.com/product/products?${qs}`,
    `https://api.alluresallol.com/product/products/?${qs}`,
  ];

  for (const u of listEndpoints) {
    const data = await tryFetch(u);
    if (!data) continue;
    const arr: any[] = Array.isArray((data as any)?.items)
      ? (data as any).items
      : Array.isArray((data as any)?.results)
      ? (data as any).results
      : Array.isArray((data as any)?.products)
      ? (data as any).products
      : Array.isArray((data as any)?.data)
      ? (data as any).data
      : Array.isArray(data)
      ? (data as any)
      : [];
    if (!arr.length) continue;
    const hit = arr.find((x: any) => String(x?.id) === pid) || arr.find((x: any) => Number(x?.id) === Number(pid));
    if (hit) {
      const p = hit as any;
      return {
        id: p.id ?? id,
        company_id: p.company_id,
        name: String(p.name ?? ''),
        description: typeof p.description === 'string' ? p.description : undefined,
        price: Number(p.price ?? 0),
        status: p.status ?? undefined,
        current_inventory: typeof p.current_inventory === 'number' ? p.current_inventory : Number(p.current_inventory ?? 0) || undefined,
        category_id: p.category_id ?? undefined,
        category_name: p.category_name ?? undefined,
        old_price: typeof p.old_price === 'number' ? p.old_price : Number(p.old_price ?? 0) || undefined,
        image: typeof p.image === 'string' ? p.image : undefined,
        subcategory: p.subcategory ?? undefined,
        product_type: p.product_type ?? undefined,
        is_hit: Boolean(p.is_hit),
        is_discount: Boolean(p.is_discount),
        is_new: Boolean(p.is_new),
        created_at: p.created_at ?? undefined,
        updated_at: p.updated_at ?? undefined,
      } as ProductRow;
    }
  }

  return null;
}

async function updateProduct(id: number | string, payload: Partial<ProductRow>): Promise<ProductRow> {
  const base = 'https://api.alluresallol.com/product/';
  const body: any = {
    company_id: payload.company_id,
    name: payload.name,
    description: payload.description,
    price: payload.price,
    status: payload.status,
    current_inventory: payload.current_inventory,
    category_id: payload.category_id,
    category_name: payload.category_name,
    old_price: payload.old_price,
    image: payload.image,
    subcategory: payload.subcategory,
    product_type: payload.product_type,
    is_hit: payload.is_hit,
    is_discount: payload.is_discount,
    is_new: payload.is_new,
  };
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

  const attempts = [
    { method: 'PATCH', url: `${base}${id}` },
    { method: 'PATCH', url: `${base}${id}/` },
    { method: 'PUT', url: `${base}${id}` },
    { method: 'PUT', url: `${base}${id}/` },
  ] as const;

  let lastErr: any = null;
  for (const a of attempts) {
    try {
      const res = await fetch(a.url, {
        method: a.method,
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { lastErr = new Error(`${a.method} ${res.status}`); continue; }
      const p = await res.json();
      return {
        id: p.id,
        company_id: p.company_id ?? body.company_id,
        name: String(p.name ?? body.name ?? ''),
        description: String(p.description ?? body.description ?? ''),
        price: Number(p.price ?? body.price ?? 0),
        status: p.status ?? body.status,
        current_inventory: typeof p.current_inventory === 'number' ? p.current_inventory : body.current_inventory,
        category_id: p.category_id ?? body.category_id,
        category_name: p.category_name ?? body.category_name,
        old_price: Number(p.old_price ?? body.old_price ?? 0),
        image: typeof p.image === 'string' ? p.image : (body.image || ''),
        subcategory: p.subcategory ?? body.subcategory,
        product_type: p.product_type ?? body.product_type,
        is_hit: Boolean(p.is_hit ?? body.is_hit),
        is_discount: Boolean(p.is_discount ?? body.is_discount),
        is_new: Boolean(p.is_new ?? body.is_new),
        created_at: p.created_at ?? undefined,
        updated_at: p.updated_at ?? undefined,
      };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Update failed');
}

// ---- API: створення продукту ----
async function createProduct(payload: Partial<ProductRow>): Promise<ProductRow> {
  const base = 'https://api.alluresallol.com/product/products';
  const body: any = {
    id: payload.id,
    company_id: payload.company_id,
    name: payload.name ?? '',
    description: payload.description ?? '',
    price: payload.price ?? 0,
    status: payload.status ?? 'active',
    current_inventory: payload.current_inventory ?? 0,
    category_id: payload.category_id,
    category_name: payload.category_name ?? '',
    old_price: payload.old_price ?? null,
    image: payload.image ?? '',
    subcategory: payload.subcategory ?? '',
    product_type: payload.product_type ?? 'physical',
    is_hit: Boolean(payload.is_hit),
    is_discount: Boolean(payload.is_discount),
    is_new: Boolean(payload.is_new),
    // created_at / updated_at — генерує бекенд
  };
  Object.keys(body).forEach((k) => body[k] === undefined && delete body[k]);

  const attempts = [
    { method: 'POST', url: `${base}` },
    { method: 'POST', url: `${base}/` },
  ] as const;

  let lastErr: any = null;
  for (const a of attempts) {
    try {
      const res = await fetch(a.url, {
        method: a.method,
        headers: { 'Content-Type': 'application/json', accept: 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) { lastErr = new Error(`${a.method} ${res.status}`); continue; }
      const p = await res.json();
      return {
        id: p.id ?? body.id,
        company_id: p.company_id ?? body.company_id,
        name: String(p.name ?? body.name ?? ''),
        description: typeof p.description === 'string' ? p.description : String(body.description ?? ''),
        price: Number(p.price ?? body.price ?? 0),
        status: p.status ?? body.status,
        current_inventory: typeof p.current_inventory === 'number' ? p.current_inventory : Number(body.current_inventory ?? 0) || 0,
        category_id: p.category_id ?? body.category_id,
        category_name: p.category_name ?? body.category_name,
        old_price: p.old_price == null ? null as any : Number(p.old_price),
        image: typeof p.image === 'string' ? p.image : String(body.image ?? ''),
        subcategory: p.subcategory ?? body.subcategory,
        product_type: p.product_type ?? body.product_type,
        is_hit: Boolean(p.is_hit ?? body.is_hit),
        is_discount: Boolean(p.is_discount ?? body.is_discount),
        is_new: Boolean(p.is_new ?? body.is_new),
        created_at: p.created_at ?? undefined,
        updated_at: p.updated_at ?? undefined,
      };
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Create product failed');
}

// ---- API: видалення продукту ----
async function deleteProduct(id: number | string): Promise<void> {
  const base = 'https://api.alluresallol.com/product/';
  const attempts = [
    `${base}${id}`,
    `${base}${id}/`,
  ];
  let lastErr: any = null;
  for (const url of attempts) {
    try {
      const res = await fetch(url, {
        method: 'DELETE',
        headers: { accept: 'application/json' },
      });
      if (res.ok) return;
      lastErr = new Error(`DELETE ${res.status}`);
    } catch (e) { lastErr = e; }
  }
  throw lastErr || new Error('Delete product failed');
}

// ---- UI helpers ----
function TabPanel(props: { children?: React.ReactNode; value: number; index: number }) {
  const { children, value, index } = props;
  return <div role="tabpanel" hidden={value !== index}>{value === index && <Box sx={{ pt: 2 }}>{children}</Box>}</div>;
}

export default function AdminPanelPage() {
  const [tab, setTab] = React.useState(0);

  // Users
  const [roleFilter, setRoleFilter] = React.useState<Role | 'all'>('all');
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [usersErr, setUsersErr] = React.useState<string | null>(null);
  const [usersOrder, setUsersOrder] = React.useState<'asc' | 'desc'>('desc');

  // Delete user dialog
  const [delOpen, setDelOpen] = React.useState(false);
  const [delUserId, setDelUserId] = React.useState<string | number | null>(null);
  const [delLoading, setDelLoading] = React.useState(false);
  const [delErr, setDelErr] = React.useState<string | null>(null);

  // Delete user handlers
  const askDeleteUser = (id: string | number) => {
    setDelErr(null);
    setDelUserId(id);
    setDelOpen(true);
  };

  const confirmDeleteUser = async () => {
    if (delUserId == null) return;
    try {
      setDelLoading(true);
      const res = await fetch(`/api/admin/users/${delUserId}`, {
        method: 'DELETE',
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) {
        let reason = '';
        try { reason = await res.text(); } catch {}
        throw new Error(`Помилка ${res.status}${reason ? `: ${reason.slice(0, 120)}` : ''}`);
      }
      // Успіх: прибираємо користувача з локального стану та закриваємо діалог
      setUsers((prev) => prev.filter((u) => String(u.id) !== String(delUserId)));
      setDelOpen(false);
    } catch (e: any) {
      setDelErr(e?.message || 'Не вдалося видалити користувача');
    } finally {
      setDelLoading(false);
    }
  };

  // Payments
  const [payments, setPayments] = React.useState<PaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = React.useState(false);
  const [paymentsErr, setPaymentsErr] = React.useState<string | null>(null);
  const [paymentsOrder, setPaymentsOrder] = React.useState<'asc' | 'desc'>('desc');

  // Products
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [productsLoading, setProductsLoading] = React.useState(false);
  const [productsOrder, setProductsOrder] = React.useState<'asc' | 'desc'>('desc');


  // Product → Reviews tab state
  const [prodReviewsProductId, setProdReviewsProductId] = React.useState<number | string | null>(null);
  const [prodReviews, setProdReviews] = React.useState<ProductReview[]>([]);
  const [prodReviewsLoading, setProdReviewsLoading] = React.useState(false);
  const [prodReviewsErr, setProdReviewsErr] = React.useState<string | null>(null);
  const [reviewStatusBusy, setReviewStatusBusy] = React.useState<Record<string, boolean>>({});
  const [reviewStatusErr, setReviewStatusErr] = React.useState<string | null>(null);
  const setBusy = (id: number | string, v: boolean) =>
    setReviewStatusBusy((prev) => ({ ...prev, [String(id)]: v }));
  const openProductReviews = async (id: number | string) => {
    setProdReviewsErr(null);
    setProdReviews([]);
    setProdReviewsProductId(id);
    try {
      setProdReviewsLoading(true);
      const data = await fetchReviewsByProduct(id);
      setProdReviews(data);
    } catch (e: any) {
      setProdReviewsErr(e?.message || 'Не вдалося завантажити відгуки');
    } finally {
      setProdReviewsLoading(false);
    }
  };

  // Old categories list for select in editor
  const [categories, setCategories] = React.useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = React.useState(false);

  React.useEffect(() => {
    try { (window as any).__cats_cache__ = categories; } catch {}
  }, [categories]);

  // Categories tab
  const [cats, setCats] = React.useState<CategoryRow[]>([]);
  const [catsLoading, setCatsLoading] = React.useState(false);
  const [catsErr, setCatsErr] = React.useState<string | null>(null);
  const [catsOrder, setCatsOrder] = React.useState<'asc' | 'desc'>('asc');

  const usersView = React.useMemo(() => {
    let arr = Array.isArray(users) ? users.slice() : [];
    if (roleFilter !== 'all') {
      const rf = String(roleFilter).toLowerCase();
      arr = arr.filter((u) => String(u.role || '').toLowerCase() === rf);
    }
    return arr.sort((a, b) => (usersOrder === 'asc' ? cmpId(a.id, b.id) : cmpId(b.id, a.id)));
  }, [users, usersOrder, roleFilter]);

  const usersRoles = React.useMemo(() => {
    const set = new Set<string>();
    users.forEach((u) => { if (u.role) set.add(String(u.role)); });
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'uk'));
  }, [users]);

  const paymentsView = React.useMemo(() => {
    const arr = Array.isArray(payments) ? payments.slice() : [];
    return arr.sort((a, b) => (paymentsOrder === 'asc' ? cmpId(a.id, b.id) : cmpId(b.id, a.id)));
  }, [payments, paymentsOrder]);

  const productsView = React.useMemo(() => {
    const arr = Array.isArray(products) ? products.slice() : [];
    return arr.sort((a, b) => (productsOrder === 'asc' ? cmpId(a.id, b.id) : cmpId(b.id, a.id)));
  }, [products, productsOrder]);


  const catsView = React.useMemo(() => {
    const arr = Array.isArray(cats) ? cats.slice() : [];
    return arr.sort((a, b) => (catsOrder === 'asc' ? cmpId(a.id, b.id) : cmpId(b.id, a.id)));
  }, [cats, catsOrder]);

  // Edit product dialog
  const [editOpen, setEditOpen] = React.useState(false);
  const [editLoading, setEditLoading] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [editProductId, setEditProductId] = React.useState<number | string | null>(null);
  const [editForm, setEditForm] = React.useState<Partial<ProductRow>>({
    company_id: undefined,
    name: '',
    description: '',
    price: 0,
    status: '',
    current_inventory: undefined,
    category_id: undefined,
    category_name: '',
    old_price: 0,
    image: '',
    subcategory: '',
    product_type: '',
    is_hit: false,
    is_discount: false,
    is_new: false,
  });

  const openEdit = async (id: number | string) => {
    setEditProductId(id);
    setEditError(null);
    setEditOpen(true);
    const p = await loadProductById(id);
    if (p) {
      setEditForm({
        company_id: p.company_id,
        name: p.name,
        description: p.description,
        price: p.price,
        status: p.status,
        current_inventory: p.current_inventory,
        category_id: p.category_id,
        category_name: p.category_name,
        old_price: p.old_price,
        image: p.image,
        subcategory: p.subcategory,
        product_type: p.product_type,
        is_hit: p.is_hit,
        is_discount: p.is_discount,
        is_new: p.is_new,
      });
    }
  };
  const handleEditChange = (field: keyof ProductRow, value: any) => setEditForm((prev) => ({ ...prev, [field]: value }));
  const saveEdit = async () => {
    if (editProductId == null) return;
    try {
      setEditLoading(true);
      const updated = await updateProduct(editProductId, editForm);
      const catName = categories.find((c) => String(c.id) === String(updated.category_id))?.name;
      const patched = catName ? { ...updated, category_name: catName } : updated;
      setProducts((prev) => prev.map((p) => (p.id === editProductId ? { ...p, ...patched } : p)));
      setEditOpen(false);
    } catch (e: any) {
      setEditError(e?.message || 'Не вдалося зберегти зміни');
    } finally { setEditLoading(false); }
  };

  // Create product dialog
  const [createOpen, setCreateOpen] = React.useState(false);
  const [createLoading, setCreateLoading] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);
  const [createForm, setCreateForm] = React.useState<Partial<ProductRow>>({
    id: undefined,
    company_id: undefined,
    name: '',
    description: '',
    price: 0,
    status: 'active',
    current_inventory: 0,
    category_id: undefined,
    category_name: '',
    old_price: null as any,
    image: '',
    subcategory: '',
    product_type: 'physical',
    is_hit: false,
    is_discount: false,
    is_new: false,
  });
  const [createCatBusy, setCreateCatBusy] = React.useState(false);
  const [createCatErr, setCreateCatErr] = React.useState<string | null>(null);

  const openCreateProduct = () => {
    setCreateError(null);
    setCreateForm({
      id: undefined,
      company_id: undefined,
      name: '',
      description: '',
      price: 0,
      status: 'active',
      current_inventory: 0,
      category_id: undefined,
      category_name: '',
      old_price: null as any,
      image: '',
      subcategory: '',
      product_type: 'physical',
      is_hit: false,
      is_discount: false,
      is_new: false,
    });
    setCreateOpen(true);
  };
  const handleCreateChange = (field: keyof ProductRow, value: any) =>
    setCreateForm((prev) => ({ ...prev, [field]: value }));

  const saveCreate = async () => {
    try {
      setCreateLoading(true);
      // якщо введено назву, але ще немає id — створимо/знайдемо категорію
      if (!createForm.category_id && (createForm.category_name || '').trim()) {
        try {
          const opt = await ensureCategoryByName((createForm.category_name as string).trim(), setCategories);
          handleCreateChange('category_id', opt.id as any);
          handleCreateChange('category_name', opt.name);
        } catch (e) {
          // не фейлим увесь сабміт — просто залишимо без категорії
        }
      }
      const created = await createProduct(createForm);
      setProducts((prev) => [created, ...prev]);
      setCreateOpen(false);
    } catch (e: any) {
      setCreateError(e?.message || 'Не вдалося створити товар');
    } finally {
      setCreateLoading(false);
    }
  };

  // Product delete dialog
  const [prodDelOpen, setProdDelOpen] = React.useState(false);
  const [prodDelId, setProdDelId] = React.useState<number | string | null>(null);
  const [prodDelLoading, setProdDelLoading] = React.useState(false);
  const [prodDelErr, setProdDelErr] = React.useState<string | null>(null);

  const askDeleteProduct = (id: number | string) => {
    setProdDelErr(null);
    setProdDelId(id);
    setProdDelOpen(true);
  };

  const confirmDeleteProduct = async () => {
    if (prodDelId == null) return;
    try {
      setProdDelLoading(true);
      await deleteProduct(prodDelId);
      setProducts((prev) => prev.filter((p) => String(p.id) !== String(prodDelId)));
      setProdDelOpen(false);
    } catch (e: any) {
      setProdDelErr(e?.message || 'Не вдалося видалити товар');
    } finally {
      setProdDelLoading(false);
    }
  };

  // Category edit dialog
  const [catEditOpen, setCatEditOpen] = React.useState(false);
  const [catEditLoading, setCatEditLoading] = React.useState(false);
  const [catEditError, setCatEditError] = React.useState<string | null>(null);
  const [catEditId, setCatEditId] = React.useState<number | string | null>(null);
  const [catEditForm, setCatEditForm] = React.useState<CategoryEditPayload>({
    category_id: undefined,
    category_name: '',
    description: '',
    subcategory: '',
    product_type: '',
  });

  const openEditCategory = (id: number | string) => {
    const row = cats.find((c) => String(c.id) === String(id));
    setCatEditId(id);
    setCatEditError(null);
    setCatEditForm({
      category_id: row?.category_id ?? (typeof id === 'number' ? id : Number(id)),
      category_name: row?.name || row?.category_name || '',
      description: row?.description || '',
      subcategory: row?.subcategory || '',
      product_type: row?.product_type || '',
    });
    setCatEditOpen(true);
  };
  const handleCatEditChange = (field: keyof CategoryEditPayload, value: any) =>
    setCatEditForm((prev) => ({ ...prev, [field]: value }));

  const saveCategory = async () => {
    if (catEditId == null) return;
    try {
      setCatEditLoading(true);
      const updated = await updateCategory(catEditId, catEditForm);
      setCats((prev) =>
        prev.map((c) =>
          String(c.id) === String(catEditId)
            ? {
                ...c,
                name: updated.name,
                description: updated.description,
                subcategory: updated.subcategory,
                product_type: updated.product_type,
                category_id: updated.category_id,
                category_name: updated.category_name,
                updated_at: updated.updated_at || c.updated_at,
              }
            : c
        )
      );
      setCatEditOpen(false);
    } catch (e: any) {
      setCatEditError(e?.message || 'Не вдалося зберегти категорію');
    } finally {
      setCatEditLoading(false);
    }
  };

  // Category create dialog
  const [catCreateOpen, setCatCreateOpen] = React.useState(false);
  const [catCreateLoading, setCatCreateLoading] = React.useState(false);
  const [catCreateError, setCatCreateError] = React.useState<string | null>(null);
  const [catCreateForm, setCatCreateForm] = React.useState<CategoryEditPayload>({
    category_id: undefined,
    category_name: '',
    description: '',
    subcategory: '',
    product_type: '',
  });

  const openCreateCategory = () => {
    setCatCreateForm({
      category_id: undefined,
      category_name: '',
      description: '',
      subcategory: '',
      product_type: '',
    });
    setCatCreateError(null);
    setCatCreateOpen(true);
  };
  const handleCatCreateChange = (field: keyof CategoryEditPayload, value: any) =>
    setCatCreateForm((prev) => ({ ...prev, [field]: value }));

  const saveCreateCategory = async () => {
    try {
      setCatCreateLoading(true);
      const created = await createCategory(catCreateForm);
      // додати щойно створену категорію на початок таблиці
      setCats((prev) => [
        {
          id: created.id,
          name: created.name,
          description: created.description,
          subcategory: created.subcategory,
          product_type: created.product_type,
          category_id: created.category_id,
          category_name: created.category_name,
          created_at: created.created_at,
          updated_at: created.updated_at,
        },
        ...prev,
      ]);
      setCatCreateOpen(false);
    } catch (e: any) {
      setCatCreateError(e?.message || 'Не вдалося створити категорію');
    } finally {
      setCatCreateLoading(false);
    }
  };

  // Category delete dialog
  const [catDelOpen, setCatDelOpen] = React.useState(false);
  const [catDelId, setCatDelId] = React.useState<number | string | null>(null);
  const [catDelLoading, setCatDelLoading] = React.useState(false);
  const [catDelErr, setCatDelErr] = React.useState<string | null>(null);
  const [catDelForce, setCatDelForce] = React.useState(false);

  const askDeleteCategory = (id: number | string) => {
    setCatDelErr(null);
    setCatDelForce(false);
    setCatDelId(id);
    setCatDelOpen(true);
  };

  const confirmDeleteCategory = async () => {
    if (catDelId == null) return;
    try {
      setCatDelLoading(true);
      await deleteCategory(catDelId, catDelForce);
      setCats((prev) => prev.filter((c) => String(c.id) !== String(catDelId)));
      setCatDelOpen(false);
    } catch (e: any) {
      setCatDelErr(e?.message || 'Не вдалося видалити категорію');
    } finally {
      setCatDelLoading(false);
    }
  };

  // Effects by tab
  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (tab === 0) {
        try {
          setUsersLoading(true);
          setUsersErr(null);
          const data = await fetchUsers(roleFilter === 'all' ? undefined : (roleFilter as Role));
          if (alive) setUsers(data);
        } catch (e: any) {
          if (alive) setUsersErr(e?.message || 'Помилка завантаження користувачів');
        } finally {
          if (alive) setUsersLoading(false);
        }
      }
      if (tab === 1) {
        try {
          setPaymentsLoading(true);
          setPaymentsErr(null);
          const data = await fetchPayments();
          if (alive) setPayments(data);
        } catch (e: any) {
          if (alive) setPaymentsErr(e?.message || 'Помилка завантаження платежів');
        } finally {
          if (alive) setPaymentsLoading(false);
        }
      }
      if (tab === 2) {
        try {
          setProductsLoading(true);
          const [prods] = await Promise.all([fetchProducts()]);
          if (alive) setProducts(prods);
        } finally {
          if (alive) setProductsLoading(false);
        }
        if (categories.length === 0 && !categoriesLoading) {
          setCategoriesLoading(true);
          fetchCategoriesAll()
            .then((cats) => { if (alive) setCategories(cats); })
            .finally(() => { if (alive) setCategoriesLoading(false); });
        }
      }
      if (tab === 3) {
        try {
          setCatsLoading(true);
          setCatsErr(null);
          const res = await fetch('https://api.alluresallol.com/product/categories', { cache: 'no-store', headers: { accept: 'application/json' } });
          if (!res.ok) throw new Error(`Categories ${res.status}`);
          const json = await res.json();
          const items: any[] = Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : (json?.results ?? []);
          const mapped: CategoryRow[] = (items || []).map((c: any, i: number) => ({
            id: c.id ?? c.category_id ?? i,
            name: c.name ?? c.category_name ?? c.title ?? c.label ?? '—',
            description: c.description ?? c.desc ?? '',
            parent_id: c.parent_id ?? c.parent ?? null,
            updated_at: c.updated_at ?? c.modified_at ?? undefined,
            created_at: c.created_at ?? undefined,
            subcategory: c.subcategory ?? '',
            product_type: c.product_type ?? '',
            category_id: c.category_id ?? (typeof c.id === 'number' ? c.id : undefined),
            category_name: c.category_name ?? c.name ?? undefined,
          }));
          if (alive) setCats(mapped);
        } catch (e: any) {
          if (alive) setCatsErr(e?.message || 'Помилка завантаження категорій');
        } finally {
          if (alive) setCatsLoading(false);
        }
      }
      if (tab === 4) {
        try {
          setCatsLoading(true);
          setCatsErr(null);
          const res = await fetch('https://api.alluresallol.com/product/categories', { cache: 'no-store', headers: { accept: 'application/json' } });
          if (!res.ok) throw new Error(`Categories ${res.status}`);
          const json = await res.json();
          const items: any[] = Array.isArray(json?.items) ? json.items : Array.isArray(json) ? json : (json?.results ?? []);
          const mapped: CategoryRow[] = (items || []).map((c: any, i: number) => ({
            id: c.id ?? c.category_id ?? i,
            name: c.name ?? c.category_name ?? c.title ?? c.label ?? '—',
            description: c.description ?? c.desc ?? '',
            parent_id: c.parent_id ?? c.parent ?? null,
            updated_at: c.updated_at ?? c.modified_at ?? undefined,
            created_at: c.created_at ?? undefined,
            subcategory: c.subcategory ?? '',
            product_type: c.product_type ?? '',
            category_id: c.category_id ?? (typeof c.id === 'number' ? c.id : undefined),
            category_name: c.category_name ?? c.name ?? undefined,
          }));
          if (alive) setCats(mapped);
        } catch (e: any) {
          if (alive) setCatsErr(e?.message || 'Помилка завантаження категорій');
        } finally {
          if (alive) setCatsLoading(false);
        }
      }
      if (tab === 4) {
        try {
          setProductsLoading(true);
          const list = await fetchProducts();
          setProducts(list);
        } finally {
          setProductsLoading(false);
        }
      }
    })();
    return () => { alive = false; };
  }, [tab, roleFilter, categories.length, categoriesLoading]);

  return (
    <NoSsr defer>
      <Box sx={{ maxWidth: 1280, mx: 'auto', px: 2, py: 3 }}>
        <Typography variant="h5" fontWeight={700} gutterBottom>Адмін-панель</Typography>

        <Paper variant="outlined" sx={{ borderRadius: 2 }}>
          <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tab label="Користувачі" />
            <Tab label="Платежі" />
            <Tab label="Товари" />
            <Tab label="Категорії" />
            <Tab label="Відгуки по товарах" />
          </Tabs>
            {/* Products → Reviews */}
            <TabPanel value={tab} index={4}>
              <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
                {/* Left: products list */}
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>Товари</Typography>
                  {productsLoading ? (
                    <Stack alignItems="center" py={3}><CircularProgress /></Stack>
                  ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 520 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Зображення</TableCell>
                            <TableCell>Назва</TableCell>
                            <TableCell align="right">Ціна</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {productsView.map((p) => (
                            <TableRow
                              key={p.id}
                              hover
                              onClick={() => openProductReviews(p.id)}
                              sx={{ cursor: 'pointer' }}
                              selected={String(prodReviewsProductId) === String(p.id)}
                            >
                              <TableCell>{p.id}</TableCell>
                              <TableCell>
                                <Box sx={{ width: 56, height: 42 }}>
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={imgSrc(p.image)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                                </Box>
                              </TableCell>
                              <TableCell>{p.name}</TableCell>
                              <TableCell align="right">{fmtUA(p.price)} ₴</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>

                {/* Right: reviews of selected product */}
                <Box sx={{ flex: 1.1, minWidth: 0 }}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }}>
                    Відгуки {prodReviewsProductId ? <>для товару <code>#{String(prodReviewsProductId)}</code></> : null}
                  </Typography>
                  {reviewStatusErr && <Alert severity="error" sx={{ mb: 1 }}>{reviewStatusErr}</Alert>}
                  {!prodReviewsProductId ? (
                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                      Оберіть товар зліва, щоб переглянути відгуки.
                    </Paper>
                  ) : prodReviewsLoading ? (
                    <Stack alignItems="center" py={3}><CircularProgress /></Stack>
                  ) : prodReviewsErr ? (
                    <Alert severity="error">{prodReviewsErr}</Alert>
                  ) : prodReviews.length === 0 ? (
                    <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
                      Відгуків поки немає.
                    </Paper>
                  ) : (
                    <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, maxHeight: 520 }}>
                      <Table size="small" stickyHeader>
                        <TableHead>
                          <TableRow>
                            <TableCell>ID</TableCell>
                            <TableCell>Користувач</TableCell>
                            <TableCell>Текст</TableCell>
                            <TableCell>Статус</TableCell>
                            <TableCell>Тональність</TableCell>
                            <TableCell align="right">POS</TableCell>
                            <TableCell align="right">NEG</TableCell>
                            <TableCell>Створено</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {prodReviews.map((r) => (
                            <TableRow key={String(r.id)} hover>
                              <TableCell>{r.id}</TableCell>
                              <TableCell>{r.user_id}</TableCell>
                              <TableCell>{r.text}</TableCell>
                              <TableCell>
                                <FormControl size="small" fullWidth>
                                  <Select
                                    value={(r.status as any) || 'PENDING'}
                                    onChange={async (e) => {
                                      const next = String(e.target.value);
                                      setReviewStatusErr(null);
                                      setBusy(r.id, true);
                                      try {
                                        await updateReviewStatus(r.id, next);
                                        setProdReviews((prev) => prev.map((x) => (String(x.id) === String(r.id) ? { ...x, status: next as any } : x)));
                                      } catch (err: any) {
                                        setReviewStatusErr(err?.message || 'Не вдалося оновити статус відгуку');
                                      } finally {
                                        setBusy(r.id, false);
                                      }
                                    }}
                                    disabled={!!reviewStatusBusy[String(r.id)]}
                                  >
                                    {Array.from(REVIEW_STATUSES).map((s) => (
                                      <MenuItem key={s} value={s}>{s}</MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </TableCell>
                              <TableCell>
                                <Chip
                                  size="small"
                                  label={r.sentiment}
                                  color={r.sentiment === 'positive' ? 'success' : r.sentiment === 'neutral' ? 'default' : 'error'}
                                />
                              </TableCell>
                              <TableCell align="right">{(Math.round((Number(r.pos_score) || 0) * 1000) / 10).toFixed(1)}%</TableCell>
                              <TableCell align="right">{(Math.round((Number(r.neg_score) || 0) * 1000) / 10).toFixed(1)}%</TableCell>
                              <TableCell>{r.created_at ? new Date(r.created_at).toLocaleString('uk-UA') : '—'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </TableContainer>
                  )}
                </Box>
              </Stack>
            </TabPanel>

          <Box sx={{ p: 2 }}>
            {/* Users */}
            <TabPanel value={tab} index={0}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <FormControl sx={{ minWidth: 200 }} size="small">
                  <InputLabel id="role-filter">Роль</InputLabel>
                  <Select labelId="role-filter" label="Роль" value={roleFilter} onChange={(e) => setRoleFilter(e.target.value as any)}>
                    <MenuItem value="all">Всі</MenuItem>
                    {usersRoles.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                  </Select>
                </FormControl>
                <TextField size="small" label="Пошук (ім'я/емейл)" placeholder="Введіть…" disabled />
                <FormControl sx={{ minWidth: 180 }} size="small">
                  <InputLabel id="users-sort-id">Сортування ID</InputLabel>
                  <Select labelId="users-sort-id" label="Сортування ID" value={usersOrder} onChange={(e) => setUsersOrder(e.target.value as 'asc' | 'desc')}>
                    <MenuItem value="desc">За спаданням (9 → 1)</MenuItem>
                    <MenuItem value="asc">За зростанням (1 → 9)</MenuItem>
                  </Select>
                </FormControl>
              </Stack>

              {usersLoading ? (
                <Stack alignItems="center" py={4}><CircularProgress /></Stack>
              ) : usersErr ? (
                <Alert severity="error">{usersErr}</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2, overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Аватар</TableCell>
                        <TableCell>ID</TableCell>
                        <TableCell>Логін</TableCell>
                        <TableCell>ПІБ</TableCell>
                        <TableCell>Email</TableCell>
                        <TableCell>Телефон</TableCell>
                        <TableCell>Мова</TableCell>
                        <TableCell align="right">Бонуси</TableCell>
                        <TableCell>Адреса доставки</TableCell>
                        <TableCell>Зареєстровано</TableCell>
                        <TableCell>Роль</TableCell>
                        <TableCell>Статус</TableCell>
                        <TableCell align="center">Дії</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {usersView.map((u) => (
                        <TableRow key={u.id} hover>
                          <TableCell>
                            <Box sx={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', bgcolor: '#f3f4f6' }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={u.avatar_url || '/avatar-placeholder.png'} alt={u.full_name || u.name || String(u.id)} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </Box>
                          </TableCell>
                          <TableCell>{u.id}</TableCell>
                          <TableCell>{u.login || '—'}</TableCell>
                          <TableCell>{u.full_name || u.name || '—'}</TableCell>
                          <TableCell>{u.email}</TableCell>
                          <TableCell>{u.phone || '—'}</TableCell>
                          <TableCell>{u.language ? <Chip label={String(u.language).toUpperCase()} size="small" /> : '—'}</TableCell>
                          <TableCell align="right">{typeof u.bonus_balance === 'number' ? fmtUA(u.bonus_balance) : '0'}</TableCell>
                          <TableCell>{u.delivery_address || '—'}</TableCell>
                          <TableCell>{u.registered_at ? new Date(u.registered_at).toLocaleString('uk-UA') : '—'}</TableCell>
                          <TableCell>
                            <Chip
                              label={u.role || 'user'}
                              size="small"
                              color={String(u.role).toLowerCase() === 'admin' ? 'error' : String(u.role).toLowerCase() === 'manager' ? 'warning' : 'default'}
                            />
                          </TableCell>
                          <TableCell>
                            <Chip label={u.is_blocked ? 'Заблокований' : 'Активний'} size="small" color={u.is_blocked ? 'error' : 'success'} />
                          </TableCell>
                          <TableCell align="center">
                            <IconButton aria-label="Видалити користувача" color="error" onClick={() => askDeleteUser(u.id)} size="small">
                              <DeleteForeverOutlinedIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>

            {/* Payments */}
            <TabPanel value={tab} index={1}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
                <FormControl sx={{ minWidth: 220 }} size="small">
                  <InputLabel id="payments-sort-id">Сортування ID</InputLabel>
                  <Select labelId="payments-sort-id" label="Сортування ID" value={paymentsOrder} onChange={(e) => setPaymentsOrder(e.target.value as 'asc' | 'desc')}>
                    <MenuItem value="desc">За спаданням (9 → 1)</MenuItem>
                    <MenuItem value="asc">За зростанням (1 → 9)</MenuItem>
                  </Select>
                </FormControl>
              </Stack>
              {paymentsLoading ? (
                <Stack alignItems="center" py={4}><CircularProgress /></Stack>
              ) : paymentsErr ? (
                <Alert severity="error">{paymentsErr}</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Користувач</TableCell>
                        <TableCell>Сума</TableCell>
                        <TableCell>Статус</TableCell>
                        <TableCell>Створено</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {paymentsView.map((p) => (
                        <TableRow key={p.id} hover>
                          <TableCell>{p.id}</TableCell>
                          <TableCell>{p.user}</TableCell>
                          <TableCell>{fmtUA(p.amount)} {p.currency || 'UAH'}</TableCell>
                          <TableCell>
                            <Chip label={p.status} size="small" color={p.status === 'paid' ? 'success' : p.status === 'pending' ? 'warning' : 'error'} />
                          </TableCell>
                          <TableCell>{p.created_at ? new Date(p.created_at).toLocaleString('uk-UA') : '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>

            {/* Products */}
            <TabPanel value={tab} index={2}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <FormControl sx={{ minWidth: 220 }} size="small">
                  <InputLabel id="products-sort-id">Сортування ID</InputLabel>
                  <Select labelId="products-sort-id" label="Сортування ID" value={productsOrder} onChange={(e) => setProductsOrder(e.target.value as 'asc' | 'desc')}>
                    <MenuItem value="desc">За спаданням (9 → 1)</MenuItem>
                    <MenuItem value="asc">За зростанням (1 → 9)</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="contained" onClick={openCreateProduct}>Додати товар</Button>
              </Stack>
              {productsLoading ? (
                <Stack alignItems="center" py={4}><CircularProgress /></Stack>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Зображення</TableCell>
                        <TableCell>Назва</TableCell>
                        <TableCell>Категорія</TableCell>
                        <TableCell align="right">Ціна</TableCell>
                        <TableCell align="center">Дії</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {productsView.map((p) => (
                        <TableRow key={p.id} hover onClick={() => openEdit(p.id)} sx={{ cursor: 'pointer' }}>
                          <TableCell>{p.id}</TableCell>
                          <TableCell>
                            <Box sx={{ width: 64, height: 48 }}>
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={imgSrc(p.image)} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                            </Box>
                          </TableCell>
                          <TableCell>{p.name}</TableCell>
                          <TableCell>{p.category_name || '—'}</TableCell>
                          <TableCell align="right">
                            {p.is_discount && p.old_price && p.old_price > 0 && (
                              <Typography component="span" sx={{ textDecoration: 'line-through', color: 'text.secondary', mr: 1 }}>
                                {fmtUA(p.old_price)} ₴
                              </Typography>
                            )}
                            <Typography component="span" fontWeight={700}>{fmtUA(p.price)} ₴</Typography>
                          </TableCell>
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            <IconButton aria-label="Видалити товар" color="error" size="small" onClick={() => askDeleteProduct(p.id)}>
                              <DeleteForeverOutlinedIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>


            {/* Categories with edit on row click */}
            <TabPanel value={tab} index={3}>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                <FormControl sx={{ minWidth: 220 }} size="small">
                  <InputLabel id="cats-sort-id">Сортування ID</InputLabel>
                  <Select labelId="cats-sort-id" label="Сортування ID" value={catsOrder} onChange={(e) => setCatsOrder(e.target.value as 'asc' | 'desc')}>
                    <MenuItem value="asc">За зростанням (1 → 9)</MenuItem>
                    <MenuItem value="desc">За спаданням (9 → 1)</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="contained" onClick={openCreateCategory}>Додати категорію</Button>
              </Stack>
              {catsLoading ? (
                <Stack alignItems="center" py={4}><CircularProgress /></Stack>
              ) : catsErr ? (
                <Alert severity="error">{catsErr}</Alert>
              ) : (
                <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>ID</TableCell>
                        <TableCell>Назва</TableCell>
                        <TableCell>Опис</TableCell>
                        <TableCell align="center">Дії</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {catsView.map((c) => (
                        <TableRow
                          key={String(c.id)}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => openEditCategory(c.id)}
                        >
                          <TableCell>{String(c.id)}</TableCell>
                          <TableCell>{c.name || '—'}</TableCell>
                          <TableCell>{c.description || '—'}</TableCell>
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            <IconButton aria-label="Видалити категорію" color="error" size="small" onClick={() => askDeleteCategory(c.id)}>
                              <DeleteForeverOutlinedIcon />
                            </IconButton>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </TabPanel>

            {/* Create Product Dialog */}
            <Dialog open={createOpen} onClose={() => setCreateOpen(false)} fullWidth maxWidth="sm">
              <DialogTitle>Створити товар</DialogTitle>
              <DialogContent dividers>
                <Stack spacing={2} mt={1}>
                  {createError && <Alert severity="error">{createError}</Alert>}
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="ID (необов’язково)"
                      type="number"
                      value={createForm.id ?? ''}
                      onChange={(e) => handleCreateChange('id', Number(e.target.value))}
                      fullWidth
                    />
                    <TextField
                      label="Компанія ID"
                      type="number"
                      value={createForm.company_id ?? ''}
                      onChange={(e) => handleCreateChange('company_id', Number(e.target.value))}
                      fullWidth
                    />
                  </Stack>
                  <TextField
                    label="Назва"
                    value={createForm.name ?? ''}
                    onChange={(e) => handleCreateChange('name', e.target.value)}
                    fullWidth
                  />
                  <Autocomplete
                    freeSolo
                    options={categories}
                    getOptionLabel={(option) => {
                      if (typeof option === 'string') return option;
                      return option?.name || '';
                    }}
                    value={
                      createForm.category_id
                        ? (categories.find((c) => String(c.id) === String(createForm.category_id)) || null)
                        : (createForm.category_name ? (createForm.category_name as unknown as any) : null)
                    }
                    onChange={async (_e, val) => {
                      setCreateCatErr(null);
                      // selected existing option
                      if (val && typeof val !== 'string') {
                        handleCreateChange('category_id', (val as CategoryOption).id);
                        handleCreateChange('category_name', (val as CategoryOption).name);
                        return;
                      }
                      // user typed and selected raw string -> create category
                      const raw = (val || createForm.category_name || '').toString().trim();
                      if (!raw) {
                        handleCreateChange('category_id', undefined as any);
                        handleCreateChange('category_name', '');
                        return;
                      }
                      try {
                        setCreateCatBusy(true);
                        const option = await ensureCategoryByName(raw, setCategories);
                        handleCreateChange('category_id', option.id as any);
                        handleCreateChange('category_name', option.name);
                      } catch (e: any) {
                        setCreateCatErr(e?.message || 'Не вдалося створити категорію');
                      } finally {
                        setCreateCatBusy(false);
                      }
                    }}
                    onInputChange={(_e, val) => {
                      setCreateCatErr(null);
                      handleCreateChange('category_name', val);
                      // если пользователь стер ввод — очищаем выбранную категорию
                      if (val === '') {
                        handleCreateChange('category_id', undefined as any);
                      }
                    }}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Категорія (оберіть або введіть нову)"
                        fullWidth
                        helperText={createCatErr ? createCatErr : (createCatBusy ? 'Створюємо категорію…' : 'Почніть вводити — можна обрати існуючу або створити нову')}
                      />
                    )}
                    renderOption={(props, option) => {
                      const key = typeof option === 'string' ? option : option.name;
                      return (
                        <li {...props} key={key}>
                          {typeof option === 'string' ? option : option.name}
                        </li>
                      );
                    }}
                  />
                  <TextField
                    label="Опис"
                    value={createForm.description ?? ''}
                    onChange={(e) => handleCreateChange('description', e.target.value)}
                    fullWidth
                    multiline
                    minRows={3}
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Ціна"
                      type="number"
                      value={createForm.price ?? 0}
                      onChange={(e) => handleCreateChange('price', Number(e.target.value))}
                      fullWidth
                    />
                    <TextField
                      label="Стара ціна (old_price)"
                      type="number"
                      value={(createForm.old_price as any) ?? ''}
                      onChange={(e) => handleCreateChange('old_price', e.target.value === '' ? null : Number(e.target.value))}
                      fullWidth
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Залишок (current_inventory)"
                      type="number"
                      value={createForm.current_inventory ?? 0}
                      onChange={(e) => handleCreateChange('current_inventory', Number(e.target.value))}
                      fullWidth
                    />
                    <TextField
                      label="Статус"
                      value={createForm.status ?? 'active'}
                      onChange={(e) => handleCreateChange('status', e.target.value)}
                      fullWidth
                    />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Підкатегорія (subcategory)"
                      value={createForm.subcategory ?? ''}
                      onChange={(e) => handleCreateChange('subcategory', e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Тип продукту (product_type)"
                      value={createForm.product_type ?? 'physical'}
                      onChange={(e) => handleCreateChange('product_type', e.target.value)}
                      fullWidth
                    />
                  </Stack>
                  <TextField
                    label="Зображення (URL)"
                    value={createForm.image ?? ''}
                    onChange={(e) => handleCreateChange('image', e.target.value)}
                    fullWidth
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <FormControlLabel
                      control={<Checkbox checked={Boolean(createForm.is_hit)} onChange={(e) => handleCreateChange('is_hit', e.target.checked)} />}
                      label="Хіт"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={Boolean(createForm.is_discount)} onChange={(e) => handleCreateChange('is_discount', e.target.checked)} />}
                      label="Акційний"
                    />
                    <FormControlLabel
                      control={<Checkbox checked={Boolean(createForm.is_new)} onChange={(e) => handleCreateChange('is_new', e.target.checked)} />}
                      label="Новинка"
                    />
                  </Stack>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setCreateOpen(false)} disabled={createLoading}>Скасувати</Button>
                <Button onClick={saveCreate} variant="contained" disabled={createLoading}>
                  {createLoading ? 'Створення…' : 'Створити'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Edit Product Dialog */}
            <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
              <DialogTitle>Редагувати товар #{String(editProductId || '')}</DialogTitle>
              <DialogContent dividers>
                <Stack spacing={2} mt={1}>
                  {editError && <Alert severity="error">{editError}</Alert>}
                  <TextField label="Назва" value={editForm.name ?? ''} onChange={(e) => handleEditChange('name', e.target.value)} fullWidth />
                  <FormControl fullWidth size="small">
                    <InputLabel id="edit-category">Категорія</InputLabel>
                    <Select labelId="edit-category" label="Категорія" value={editForm.category_id ?? ''} onChange={(e) => handleEditChange('category_id', e.target.value)}>
                      <MenuItem value="">—</MenuItem>
                      {categories.map((c) => <MenuItem key={String(c.id)} value={c.id}>{c.name}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField label="Опис" value={editForm.description ?? ''} onChange={(e) => handleEditChange('description', e.target.value)} fullWidth multiline minRows={3} />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField label="Компанія ID" type="number" value={editForm.company_id ?? ''} onChange={(e) => handleEditChange('company_id', Number(e.target.value))} fullWidth />
                    <TextField label="Статус" value={editForm.status ?? ''} onChange={(e) => handleEditChange('status', e.target.value)} fullWidth />
                  </Stack>
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField label="Залишок (current_inventory)" type="number" value={editForm.current_inventory ?? ''} onChange={(e) => handleEditChange('current_inventory', Number(e.target.value))} fullWidth />
                    <TextField label="Підкатегорія" value={editForm.subcategory ?? ''} onChange={(e) => handleEditChange('subcategory', e.target.value)} fullWidth />
                  </Stack>
                  <TextField label="Тип продукту" value={editForm.product_type ?? ''} onChange={(e) => handleEditChange('product_type', e.target.value)} fullWidth />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField label="Ціна" type="number" value={editForm.price ?? 0} onChange={(e) => handleEditChange('price', Number(e.target.value))} fullWidth />
                    <TextField label="Стара ціна" type="number" value={editForm.old_price ?? 0} onChange={(e) => handleEditChange('old_price', Number(e.target.value))} fullWidth />
                  </Stack>
                  <TextField label="Зображення (URL)" value={editForm.image ?? ''} onChange={(e) => handleEditChange('image', e.target.value)} fullWidth />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <FormControlLabel control={<Checkbox checked={Boolean(editForm.is_hit)} onChange={(e) => handleEditChange('is_hit', e.target.checked)} />} label="Хіт" />
                    <FormControlLabel control={<Checkbox checked={Boolean(editForm.is_discount)} onChange={(e) => handleEditChange('is_discount', e.target.checked)} />} label="Акційний" />
                    <FormControlLabel control={<Checkbox checked={Boolean(editForm.is_new)} onChange={(e) => handleEditChange('is_new', e.target.checked)} />} label="Новинка" />
                  </Stack>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setEditOpen(false)} disabled={editLoading}>Скасувати</Button>
                <Button onClick={saveEdit} variant="contained" disabled={editLoading}>{editLoading ? 'Збереження…' : 'Зберегти'}</Button>
              </DialogActions>
            </Dialog>

            {/* Delete Product Dialog */}
            <Dialog open={prodDelOpen} onClose={() => !prodDelLoading && setProdDelOpen(false)} maxWidth="xs" fullWidth>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberOutlinedIcon color="warning" /> Підтвердіть видалення товару
              </DialogTitle>
              <DialogContent dividers>
                {prodDelErr && <Alert severity="error" sx={{ mb: 2 }}>{prodDelErr}</Alert>}
                <Typography>
                  Ви впевнені, що хочете <strong>видалити</strong> товар з ID:&nbsp;
                  <code>{String(prodDelId ?? '')}</code>?
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setProdDelOpen(false)} disabled={prodDelLoading}>Скасувати</Button>
                <Button onClick={confirmDeleteProduct} color="error" variant="contained" disabled={prodDelLoading}>
                  {prodDelLoading ? 'Видалення…' : 'Видалити'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Delete User Dialog */}
            <Dialog open={delOpen} onClose={() => !delLoading && setDelOpen(false)} maxWidth="xs" fullWidth>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberOutlinedIcon color="warning" /> Підтвердіть видалення
              </DialogTitle>
              <DialogContent dividers>
                {delErr && <Alert severity="error" sx={{ mb: 2 }}>{delErr}</Alert>}
                <Typography>
                  Ви впевнені, що хочете <strong>видалити</strong> користувача з ID:&nbsp;
                  <code>{String(delUserId ?? '')}</code>?
                </Typography>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDelOpen(false)} disabled={delLoading}>Скасувати</Button>
                <Button onClick={confirmDeleteUser} color="error" variant="contained" disabled={delLoading}>
                  {delLoading ? 'Видалення…' : 'Видалити'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Edit Category Dialog */}
            <Dialog open={catEditOpen} onClose={() => setCatEditOpen(false)} fullWidth maxWidth="sm">
              <DialogTitle>Редагувати категорію #{String(catEditId || '')}</DialogTitle>
              <DialogContent dividers>
                <Stack spacing={2} mt={1}>
                  {catEditError && <Alert severity="error">{catEditError}</Alert>}
                  <TextField
                    label="ID категорії (category_id)"
                    type="number"
                    value={catEditForm.category_id ?? ''}
                    onChange={(e) => handleCatEditChange('category_id', Number(e.target.value))}
                    fullWidth
                  />
                  <TextField
                    label="Назва (category_name)"
                    value={catEditForm.category_name ?? ''}
                    onChange={(e) => handleCatEditChange('category_name', e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Опис (description)"
                    value={catEditForm.description ?? ''}
                    onChange={(e) => handleCatEditChange('description', e.target.value)}
                    fullWidth
                    multiline
                    minRows={3}
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Підкатегорія (subcategory)"
                      value={catEditForm.subcategory ?? ''}
                      onChange={(e) => handleCatEditChange('subcategory', e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Тип продукту (product_type)"
                      value={catEditForm.product_type ?? ''}
                      onChange={(e) => handleCatEditChange('product_type', e.target.value)}
                      fullWidth
                    />
                  </Stack>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setCatEditOpen(false)} disabled={catEditLoading}>Скасувати</Button>
                <Button onClick={saveCategory} variant="contained" disabled={catEditLoading}>
                  {catEditLoading ? 'Збереження…' : 'Зберегти'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Create Category Dialog */}
            <Dialog open={catCreateOpen} onClose={() => setCatCreateOpen(false)} fullWidth maxWidth="sm">
              <DialogTitle>Створити категорію</DialogTitle>
              <DialogContent dividers>
                <Stack spacing={2} mt={1}>
                  {catCreateError && <Alert severity="error">{catCreateError}</Alert>}
                  <TextField
                    label="ID категорії (category_id)"
                    type="number"
                    value={catCreateForm.category_id ?? ''}
                    onChange={(e) => handleCatCreateChange('category_id', Number(e.target.value))}
                    fullWidth
                  />
                  <TextField
                    label="Назва (category_name)"
                    value={catCreateForm.category_name ?? ''}
                    onChange={(e) => handleCatCreateChange('category_name', e.target.value)}
                    fullWidth
                  />
                  <TextField
                    label="Опис (description)"
                    value={catCreateForm.description ?? ''}
                    onChange={(e) => handleCatCreateChange('description', e.target.value)}
                    fullWidth
                    multiline
                    minRows={3}
                  />
                  <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                    <TextField
                      label="Підкатегорія (subcategory)"
                      value={catCreateForm.subcategory ?? ''}
                      onChange={(e) => handleCatCreateChange('subcategory', e.target.value)}
                      fullWidth
                    />
                    <TextField
                      label="Тип продукту (product_type)"
                      value={catCreateForm.product_type ?? ''}
                      onChange={(e) => handleCatCreateChange('product_type', e.target.value)}
                      fullWidth
                    />
                  </Stack>
                </Stack>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setCatCreateOpen(false)} disabled={catCreateLoading}>Скасувати</Button>
                <Button onClick={saveCreateCategory} variant="contained" disabled={catCreateLoading}>
                  {catCreateLoading ? 'Створення…' : 'Створити'}
                </Button>
              </DialogActions>
            </Dialog>

            {/* Delete Category Dialog */}
            <Dialog open={catDelOpen} onClose={() => !catDelLoading && setCatDelOpen(false)} maxWidth="xs" fullWidth>
              <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <WarningAmberOutlinedIcon color="warning" /> Підтвердіть видалення категорії
              </DialogTitle>
              <DialogContent dividers>
                {catDelErr && <Alert severity="error" sx={{ mb: 2 }}>{catDelErr}</Alert>}
                <Typography sx={{ mb: 2 }}>
                  Ви впевнені, що хочете <strong>видалити</strong> категорію з ID:&nbsp;
                  <code>{String(catDelId ?? '')}</code>?
                </Typography>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={catDelForce}
                      onChange={(e) => setCatDelForce(e.target.checked)}
                      disabled={catDelLoading}
                    />
                  }
                  label="Видалити назавжди (force=true)"
                />
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setCatDelOpen(false)} disabled={catDelLoading}>Скасувати</Button>
                <Button onClick={confirmDeleteCategory} color="error" variant="contained" disabled={catDelLoading}>
                  {catDelLoading ? 'Видалення…' : 'Видалити'}
                </Button>
              </DialogActions>
            </Dialog>
          </Box>
        </Paper>

        <Stack direction="row" justifyContent="flex-end" mt={2}>
          <Button variant="outlined" onClick={() => setTab((t) => t)}>Оновити</Button>
        </Stack>
      </Box>
    </NoSsr>
  );
}