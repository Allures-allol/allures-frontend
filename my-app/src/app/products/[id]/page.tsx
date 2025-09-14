'use client';
import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../components/headers/header';
import Footer from '../../../components/footers/footer';
import Image from 'next/image';

const CART_KEY = 'allures_cart_v1';
const WISHLIST_KEY = 'allures_wishlist_v1';

type Product = {
  id: number;
  company_id?: number;
  name: string;
  description?: string;
  price: number;
  status?: string;
  current_inventory?: number;
  category_id?: number;
  category_name?: string;
  old_price?: number;
  image: string;
  subcategory?: string;
  product_type?: string;
  is_hit?: boolean;
  is_discount: boolean;
  is_new?: boolean;
  created_at?: string;
  updated_at?: string;
};

// Build safe image URLs from API payloads
const imgSrc = (src?: string | null) => {
  if (!src) return '/placeholder.png';
  const trimmed = String(src).trim();
  if (!trimmed || /^(\/)?product\/?$/i.test(trimmed) || /\/$/.test(trimmed)) {
    return '/placeholder.png';
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://api.alluresallol.com${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

// Read Allures JWT from localStorage
const getStoredAlluresToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const keys = ['allures_jwt', 'alluresJwt', 'authToken', 'token', 'jwt'];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && String(v).trim()) return String(v).trim();
  }
  // Fallback: any JWT-looking value (xxx.yyy.zzz)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) as string;
      const val = localStorage.getItem(key) || '';
      if (/\b[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/.test(val)) return val.trim();
    }
  } catch {}
  return null;
};
// ==== Reviews ====
type Review = {
  id: number;
  product_id: number;
  user_id: number;
  text: string;
  sentiment: 'positive' | 'neutral' | 'negative' | string;
  pos_score: number;
  neg_score: number;
  created_at: string;
};

// Helpers for pretty reviews rendering
function starsFromScores(pos: number, neg: number): number {
  // map pos_score (0..1) to 1..5 stars (nearest 0.5)
  const raw = Math.max(0, Math.min(1, Number(pos) || 0));
  const stars = 1 + raw * 4; // 1..5
  return Math.round(stars * 2) / 2; // step 0.5
}
function renderStars(stars: number): string {
  const full = Math.floor(stars);
  const half = stars - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  return '★'.repeat(full) + (half ? '⯪' : '') + '☆'.repeat(empty); // ⯪ ~ half-star placeholder
}
function sentimentBadgeColor(sent: string): { bg: string; color: string; border: string } {
  const s = (sent || '').toLowerCase();
  if (s === 'positive') return { bg: '#DCFCE7', color: '#166534', border: '#86EFAC' };
  if (s === 'negative') return { bg: '#FEE2E2', color: '#991B1B', border: '#FCA5A5' };
  return { bg: '#E5E7EB', color: '#374151', border: '#D1D5DB' };
}

async function getReviews(productId: string): Promise<Review[]> {
  const id = String(productId).trim();
  const urls = [
    `https://api.alluresallol.com/review/product/${id}`,
    `https://api.alluresallol.com/review/product/${id}/`,
    `https://api.alluresallol.com/review/product?product_id=${encodeURIComponent(id)}`,
    `https://api.alluresallol.com/review/product/?product_id=${encodeURIComponent(id)}`,
  ];

  const token = getStoredAlluresToken();
  const headerSets: Array<Record<string, string>> = [
    token ? { Accept: 'application/json', Authorization: `Bearer ${token}` } : { Accept: 'application/json' },
    token ? { Accept: 'application/json', Authorization: `JWT ${token}` }    : { Accept: 'application/json' },
    token ? { Accept: 'application/json', Authorization: `Token ${token}` }  : { Accept: 'application/json' },
  ];

  const tryFetch = async (url: string) => {
    for (const headers of headerSets) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 12000);
        const res = await fetch(url, { method: 'GET', cache: 'no-store', headers, signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) continue;
        const data = await res.json().catch(() => null);
        if (!data) continue;
        const list: any[] = Array.isArray(data)
          ? data
          : Array.isArray((data as any)?.items)
          ? (data as any).items
          : Array.isArray((data as any)?.results)
          ? (data as any).results
          : [];
        if (!Array.isArray(list)) continue;
        const mapped: Review[] = list
          .map((r: any): Review => ({
            id: Number(r?.id ?? 0),
            product_id: Number(r?.product_id ?? id),
            user_id: Number(r?.user_id ?? 0),
            text: String(r?.text ?? ''),
            sentiment: String(r?.sentiment ?? ''),
            pos_score: Number(r?.pos_score ?? 0),
            neg_score: Number(r?.neg_score ?? 0),
            created_at: String(r?.created_at ?? ''),
          }))
          .filter((r) => Number.isFinite(r.id));
        return mapped;
      } catch {}
    }
    return null;
  };

  let lastErr: any = null;
  for (const u of urls) {
    const result = await tryFetch(u);
    if (Array.isArray(result)) {
      return result.sort((a, b) => (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0));
    }
  }

  console.warn('getReviews: no data received for product', id);
  return [];
}

async function getProduct(id: string): Promise<Product | null> {
  const urls = [
    `https://api.alluresallol.com/product/${id}`,
    `https://api.alluresallol.com/product/${id}/`,
    `https://api.alluresallol.com/product/products/${id}`,
    `https://api.alluresallol.com/product/products/${id}/`,
    `https://api.alluresallol.com/product?id=${encodeURIComponent(String(id))}`,
  ];

  const tryFetch = async (url: string): Promise<{ data: any | null; error: string | null }> => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(url, { method: 'GET', cache: 'no-store', signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) {
        const raw = await res.text().catch(() => '');
        return { data: null, error: `HTTP ${res.status} ${res.statusText} :: ${raw.slice(0, 160)}` };
      }
      const json = await res.json();
      return { data: json, error: null };
    } catch (e: any) {
      return { data: null, error: e?.message || 'Failed to fetch' };
    }
  };

  // 1) Try direct item endpoints
  let data: any = null;
  let lastErr: string | null = null;
  for (const u of urls) {
    const r = await tryFetch(u);
    if (r.data) { data = r.data; break; }
    lastErr = r.error;
  }

  // 2) Fallback: fetch list endpoints and search item locally when direct calls fail (e.g., CORS)
  if (!data) {
    const qs = `offset=0&limit=1000&sort=-id`;
    const listCandidates = [
      `https://api.alluresallol.com/product/`,
      `https://api.alluresallol.com/product`,
      `https://api.alluresallol.com/product/products?${qs}`,
      `https://api.alluresallol.com/product/products/?${qs}`,
    ];
    for (const u of listCandidates) {
      const r = await tryFetch(u);
      if (r.data) { data = r.data; break; }
      lastErr = r.error;
    }
  }

  if (!data) {
    console.error('getProduct: API error', lastErr);
    return null;
  }

  // 3) Normalize payload (items/results/products/array or direct object)
  const arr: any[] = Array.isArray((data as any)?.items)
    ? (data as any).items
    : Array.isArray((data as any)?.results)
    ? (data as any).results
    : Array.isArray((data as any)?.products)
    ? (data as any).products
    : Array.isArray(data)
    ? (data as any)
    : [];

  const rawObj = (!Array.isArray(data) && typeof data === 'object') ? (data as any) : null;

  let raw: any = null;
  if (rawObj && (rawObj.id !== undefined || rawObj.name !== undefined)) {
    raw = rawObj;
  } else if (arr.length > 0) {
    const numId = Number(id);
    raw = arr.find((p: any) => Number(p?.id) === numId) || arr.find((p: any) => String(p?.id) === String(id));
    if (!raw) raw = arr[0];
  }

  if (!raw) return null;

  const mapped: Product = {
    id: Number(raw.id),
    company_id: raw.company_id ?? undefined,
    name: String(raw.name ?? ''),
    description: raw.description ?? undefined,
    price: Number(raw.price ?? 0),
    status: raw.status ?? undefined,
    current_inventory: typeof raw.current_inventory === 'number' ? raw.current_inventory : undefined,
    category_id: typeof raw.category_id === 'number' ? raw.category_id : undefined,
    category_name: raw.category_name ?? undefined,
    old_price: typeof raw.old_price === 'number' ? raw.old_price : undefined,
    image: String(raw.image ?? ''),
    subcategory: raw.subcategory ?? undefined,
    product_type: raw.product_type ?? undefined,
    is_hit: Boolean(raw.is_hit),
    is_discount: Boolean(raw.is_discount),
    is_new: Boolean(raw.is_new),
    created_at: raw.created_at ?? undefined,
    updated_at: raw.updated_at ?? undefined,
  };
  if (!Number.isFinite(mapped.id)) return null;
  return mapped;
}

export default function ProductDetailPage() {
  const [product, setProduct] = React.useState<Product | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = React.useState<boolean>(true);
  const params = useParams<{ id: string }>();
  const id = (params?.id as string) || '';

  const router = useRouter();

  // Wishlist state
  const [inWishlist, setInWishlist] = React.useState<boolean>(false);

  // ---- Wishlist helpers
  const readWishlist = React.useCallback((): any[] => {
    try {
      const raw = window.localStorage.getItem(WISHLIST_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch {
      return [];
    }
  }, []);

  const writeWishlist = React.useCallback((items: any[]) => {
    try {
      window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(items));
      window.dispatchEvent(new Event('wishlist:changed'));
    } catch {}
  }, []);

  const syncWishlist = React.useCallback((pid?: number) => {
    if (!pid) { setInWishlist(false); return; }
    const arr = readWishlist();
    const exists = arr.some((x: any) => Number(x?.id) === Number(pid));
    setInWishlist(exists);
  }, [readWishlist]);

  const toggleWishlist = React.useCallback((p: Product) => {
    try {
      const arr = readWishlist();
      const idx = arr.findIndex((x: any) => Number(x?.id) === Number(p.id));
      if (idx >= 0) {
        // remove
        arr.splice(idx, 1);
      } else {
        // add minimal product snapshot
        arr.push({
          id: p.id,
          name: p.name,
          price: p.price,
          old_price: typeof p.old_price === 'number' ? p.old_price : null,
          image: p.image || null,
          category_name: p.category_name || null,
          added_at: new Date().toISOString(),
        });
      }
      writeWishlist(arr);
      setInWishlist(arr.some((x: any) => Number(x?.id) === Number(p.id)));
    } catch (e) {
      console.error('toggleWishlist error:', e);
    }
  }, [readWishlist, writeWishlist]);

  // Sync wishlist flag when product changes
  React.useEffect(() => {
    if (product?.id) syncWishlist(product.id);
    else setInWishlist(false);
  }, [product, syncWishlist]);

  const addToCart = React.useCallback((p: Product, qty: number = 1) => {
    try {
      const raw = window.localStorage.getItem(CART_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const idx = Array.isArray(list) ? list.findIndex((x: any) => Number(x?.id) === Number(p.id)) : -1;
      if (idx >= 0) {
        const current = Number(list[idx]?.qty || 1);
        list[idx].qty = Math.max(1, Math.min(99, current + qty));
      } else {
        list.push({
          id: p.id,
          name: p.name,
          price: p.price,
          old_price: typeof p.old_price === 'number' ? p.old_price : null,
          image: p.image || null,
          qty: Math.max(1, qty),
          category_name: p.category_name || null,
        });
      }
      window.localStorage.setItem(CART_KEY, JSON.stringify(list));
      window.dispatchEvent(new Event('cart:changed'));
    } catch (e) {
      console.error('addToCart error:', e);
    }
  }, []);

  const handleBuy = React.useCallback(() => {
    if (!product) return;
    addToCart(product, 1);
    router.push('/cart');
  }, [product, addToCart, router]);

  const handleAdd = React.useCallback(() => {
    if (!product) return;
    addToCart(product, 1);
  }, [product, addToCart]);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      if (!id) { setLoading(false); return; }
      try {
        setLoading(true);
        const p = await getProduct(id);
        if (alive) setProduct(p);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  React.useEffect(() => {
    let alive = true;
    if (!id) { setReviews([]); setReviewsLoading(false); return; }
    (async () => {
      try {
        setReviewsLoading(true);
        const list = await getReviews(id);
        if (alive) setReviews(list);
      } finally {
        if (alive) setReviewsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [id]);

  if (loading) {
    return (
      <>
        <Header />
        <div style={{ padding: 40, textAlign: 'center' }}>Завантаження…</div>
        <Footer />
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Header />
        <div style={{ padding: 40, textAlign: 'center' }}>Товар не знайдено.</div>
        <Footer />
      </>
    );
  }

  const tabBtnBaseStyle = {
    padding: '8px 16px',
    borderRadius: 4,
    cursor: 'pointer',
    border: '1px solid #ccc',
    background: '#fff',
    color: '#000',
  } as const;


  return (
    <>
      <Header />

      {/* Breadcrumb */}
      <nav
        style={{
          fontSize: 14,
          color: '#555',
          padding: '8px 20px',
          display: 'flex',
          gap: 4,
          alignItems: 'center',
        }}
      >
        <Link href="/">🏠</Link>
        <span>/</span>
        <Link
          href={`/products?category=${encodeURIComponent(String((product.category_id ?? product.category_name) || ''))}`}
          style={{ color: '#555', textDecoration: 'none' }}
        >
          {product.category_name}
        </Link>
        <span>/</span>
        <span style={{ color: '#000' }}>{product.name}</span>
      </nav>

      {/* Main content */}
      <main style={{ maxWidth: 1200, margin: '20px auto', padding: '0 20px' }}>
        {/* Custom, slower smooth-scroll for in-page anchors */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
(function(){
  function easeInOutQuad(t){return t<0.5?2*t*t:-1+(4-2*t)*t}
  function smoothScrollTo(targetY,duration){
    var startY=window.scrollY||window.pageYOffset;
    var diff=targetY-startY;
    var startTime=null;
    function step(timestamp){
      if(!startTime) startTime=timestamp;
      var t=Math.min(1,(timestamp-startTime)/duration);
      var eased=easeInOutQuad(t);
      window.scrollTo(0, startY + diff*eased);
      if(t<1) window.requestAnimationFrame(step);
    }
    window.requestAnimationFrame(step);
  }
  document.addEventListener('click',function(e){
    var a=e.target && e.target.closest('a[href^="#"]');
    if(!a) return;
    var href=a.getAttribute('href');
    if(!href || href.length<2) return;
    var id=href.slice(1);
    var el=document.getElementById(id);
    if(!el) return;
    e.preventDefault();
    var rect=el.getBoundingClientRect();
    var targetY=rect.top + (window.scrollY||window.pageYOffset) - 96; // header offset
    smoothScrollTo(targetY, 1000); // 1000ms = медленніше
  }, true);
})();
    `
          }}
        />
        <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap' }}>
          {/* Left column: main image */}
          <div style={{ flex: '1 1 300px', minWidth: 300 }}>
            <div style={{ position: 'relative' }}>
              <Image
                src={imgSrc(product.image)}
                alt={product.name}
                width={800}
                height={800}
                style={{ borderRadius: 8, objectFit: 'contain', width: '100%', height: 'auto', display: 'block' }}
              />
              <div style={{ position: 'absolute', top: 8, left: 8, display: 'flex', gap: 6 }}>
                {product.is_new && (
                  <span style={{ padding: '2px 6px', borderRadius: 8, background: '#DCFCE7', color: '#166534', fontSize: 11 }}>NEW</span>
                )}
                {product.is_hit && (
                  <span style={{ padding: '2px 6px', borderRadius: 8, background: '#E0E7FF', color: '#3730A3', fontSize: 11 }}>HIT</span>
                )}
                {product.is_discount && (
                  <span style={{ padding: '2px 6px', borderRadius: 8, background: '#FEE2E2', color: '#991B1B', fontSize: 11 }}>SALE</span>
                )}
              </div>
              {/* Wishlist heart on image */}
              <button
                type="button"
                aria-label={inWishlist ? 'Прибрати з обраного' : 'Додати в обране'}
                onClick={() => product && toggleWishlist(product)}
                style={{
                  position: 'absolute',
                  top: 8,
                  right: 8,
                  zIndex: 3,
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  border: '1px solid rgba(0,0,0,0.08)',
                  background: 'rgba(255,255,255,0.9)',
                  backdropFilter: 'blur(4px)',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
                title={inWishlist ? 'Прибрати з обраного' : 'Додати в обране'}
              >
                <span aria-hidden style={{ fontSize: 18, lineHeight: 1, color: inWishlist ? '#ef4444' : '#9ca3af' }}>
                  {inWishlist ? '❤' : '♡'}
                </span>
              </button>
            </div>
          </div>

          {/* Right column: product info */}
          <div style={{ flex: '1 1 300px', minWidth: 300 }}>
            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
              <button
                style={{
                  ...tabBtnBaseStyle,
                  background: '#000',
                  color: '#fff',
                  border: 'none',
                }}
              >
                Про товар
              </button>
              <a
                href="#characteristics"
                style={{
                  ...tabBtnBaseStyle,
                  display: 'inline-block',
                  textDecoration: 'none',
                  lineHeight: '32px',
                  cursor: 'pointer',
                }}
              >
                Характеристики
              </a>
              <a
                href="#reviews"
                style={{
                  ...tabBtnBaseStyle,
                  display: 'inline-block',
                  textDecoration: 'none',
                  lineHeight: '32px',
                  cursor: 'pointer',
                }}
                aria-label="Перейти до відгуків"
              >
                Відгуки
              </a>
            </div>

            <h1 style={{ margin: 0, fontSize: 24 }}>{product.name}</h1>
            <div style={{ marginTop: 6, fontSize: 13, color: '#555' }}>
              {product.category_name && <span>Категорія: {product.category_name}</span>}
              {product.subcategory && <span> / {product.subcategory}</span>}
              {product.product_type && <span> • {product.product_type}</span>}
            </div>
            <div
              style={{
                margin: '8px 0 16px',
                color: '#555',
                fontSize: 14,
                borderBottom: '1px solid #eee',
                paddingBottom: 8,
              }}
            >
              {product.description}
            </div>

            {/* Rating and icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
              <div style={{ fontSize: 20, color: '#0070f3' }}>{'★★★★☆'}</div>
              <span style={{ fontSize: 20, cursor: 'pointer' }}>💬</span>
              {/* <span style={{ marginLeft: 'auto', fontSize: 20, cursor: 'pointer' }}>⚖️</span> */}
              <button
                type="button"
                aria-label={inWishlist ? 'Прибрати з обраного' : 'Додати в обране'}
                onClick={() => product && toggleWishlist(product)}
                style={{ fontSize: 20, cursor: 'pointer', border: 'none', background: 'transparent', padding: 0 }}
                title={inWishlist ? 'Прибрати з обраного' : 'Додати в обране'}
              >
                <span aria-hidden>{inWishlist ? '❤' : '♡'}</span>
              </button>
            </div>

            {/* Color swatches & code */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              {['#000', '#ccc', '#fab', '#68c'].map((color, i) => (
                <span
                  key={i}
                  style={{
                    width: 16,
                    height: 16,
                    backgroundColor: color,
                    borderRadius: '50%',
                    border: '1px solid #ccc',
                  }}
                />
              ))}
              <span style={{ marginLeft: 16, color: '#555' }}>Код: {product.id}</span>
            </div>

            {/* Availability */}
            <p style={{ marginBottom: 16, color: (product.current_inventory ?? 0) > 0 ? '#16a34a' : '#991B1B' }}>
              {(product.current_inventory ?? 0) > 0 ? 'Є в наявності' : 'Немає в наявності'}
              {product.status ? ` • Статус: ${product.status}` : ''}
              {typeof product.current_inventory === 'number' ? ` • На складі: ${product.current_inventory} шт` : ''}
            </p>

            {/* Price */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, margin: '12px 0 8px' }}>
              {product.is_discount && typeof product.old_price === 'number' && (
                <span style={{ textDecoration: 'line-through', color: '#9ca3af' }}>
                  {product.old_price.toLocaleString('uk-UA')} ₴
                </span>
              )}
              <strong style={{ fontSize: 22 }}>
                {product.price.toLocaleString('uk-UA')} ₴
              </strong>
            </div>

            {/* Price & actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={handleBuy}
                style={{
                  padding: '12px 32px',
                  background: '#0070f3',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Купити
              </button>

              <button
                type="button"
                onClick={handleAdd}
                style={{
                  padding: '12px 32px',
                  background: '#fff',
                  color: '#0070f3',
                  border: '2px solid #0070f3',
                  borderRadius: 4,
                  cursor: 'pointer',
                }}
              >
                Додати в кошик
              </button>
            </div>

            {/* Delivery options */}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14, color: '#333' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: 8 }}>Доставка</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Дата доставки</th>
                  <th style={{ textAlign: 'left', padding: 8 }}>Вартість</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Самовивіз з пунктів видачі Allures', 'Завтра з 12:00', 'Безкоштовно'],
                  ['Кур’єр на вашу адресу', 'Завтра з 10:00', 'Безкоштовно від 1\u00A0000\u00A0₴'],
                  ['Доставка Нової Пошти', 'Відправимо завтра', 'За тарифами перевізника'],
                ].map((row, i) => (
                  <tr key={i} style={{ borderTop: i > 0 ? '1px solid #eee' : 'none' }}>
                    {row.map((cell, j) => (
                      <td key={j} style={{ padding: 8 }}>
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Description */}
        <section style={{ marginTop: 40 }}>
          <h2>Опис товару</h2>
          <p style={{ lineHeight: 1.6, color: '#333' }}>{product.description}</p>
        </section>

        {/* Characteristics */}
        <section id="characteristics" style={{ marginTop: 40, scrollMarginTop: 96 }}>
          <h2>Характеристики</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              <tr>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>Ціна</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>
                  {product.price.toLocaleString('uk-UA')} ₴
                </td>
              </tr>
              <tr>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>Категорія</td>
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{product.category_name || '—'}</td>
              </tr>
              {product.subcategory && (
                <tr>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>Підкатегорія</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{product.subcategory}</td>
                </tr>
              )}
              {product.product_type && (
                <tr>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>Тип</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{product.product_type}</td>
                </tr>
              )}
              {product.status && (
                <tr>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>Статус</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{product.status}</td>
                </tr>
              )}
              {typeof product.current_inventory === 'number' && (
                <tr>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>Залишок</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{product.current_inventory} шт</td>
                </tr>
              )}
              {product.created_at && (
                <tr>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>Створено</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{new Date(product.created_at).toLocaleString('uk-UA')}</td>
                </tr>
              )}
              {product.updated_at && (
                <tr>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>Оновлено</td>
                  <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{new Date(product.updated_at).toLocaleString('uk-UA')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Reviews */}
        <section id="reviews" style={{ marginTop: 40, marginBottom: 40, scrollMarginTop: 96 }}>
          <h2 style={{ marginBottom: 8 }}>Відгуки</h2>

          {reviewsLoading && (
            <div style={{ padding: '12px 0', color: '#6b7280' }}>Завантаження відгуків…</div>
          )}

          {!reviewsLoading && reviews.length === 0 && (
            <div
              style={{
                padding: 16,
                border: '1px dashed #CBD5E1',
                borderRadius: 12,
                background: '#F8FAFC',
                color: '#64748B',
              }}
            >
              Поки що немає відгуків
            </div>
          )}

          {!reviewsLoading && reviews.length > 0 && (
            <>
              {/* summary bar */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 12,
                  border: '1px solid #E5E7EB',
                  borderRadius: 12,
                  background: '#FFFFFF',
                  marginBottom: 12,
                }}
              >
                {(() => {
                  const avg = Math.round(
                    (reviews.reduce((acc, r) => acc + starsFromScores(r.pos_score, r.neg_score), 0) / reviews.length) * 10
                  ) / 10;
                  const pos = reviews.filter((r) => (r.sentiment || '').toLowerCase() === 'positive').length;
                  const neu = reviews.filter((r) => (r.sentiment || '').toLowerCase() === 'neutral').length;
                  const neg = reviews.filter((r) => (r.sentiment || '').toLowerCase() === 'negative').length;
                  return (
                    <>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{renderStars(avg)}</div>
                      <div style={{ color: '#6b7280', fontSize: 14 }}>Середня оцінка</div>
                      <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: '#DCFCE7', color: '#166534', border: '1px solid #86EFAC' }}>
                          Позитивні: {pos}
                        </span>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: '#E5E7EB', color: '#374151', border: '1px solid #D1D5DB' }}>
                          Нейтральні: {neu}
                        </span>
                        <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 999, background: '#FEE2E2', color: '#991B1B', border: '1px solid #FCA5A5' }}>
                          Негативні: {neg}
                        </span>
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* reviews list */}
              <div style={{ display: 'grid', gap: 12 }}>
                {reviews.map((r) => {
                  const stars = starsFromScores(r.pos_score, r.neg_score);
                  const badge = sentimentBadgeColor(r.sentiment);
                  const created = r.created_at ? new Date(r.created_at).toLocaleString('uk-UA') : '';
                  return (
                    <article
                      key={r.id}
                      style={{
                        border: '1px solid #E5E7EB',
                        borderRadius: 12,
                        padding: 16,
                        background: '#fff',
                      }}
                    >
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        {/* avatar */}
                        <div
                          style={{
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            background: '#E5E7EB',
                            display: 'grid',
                            placeItems: 'center',
                            fontWeight: 700,
                            color: '#374151',
                            flex: '0 0 auto',
                          }}
                          aria-hidden
                        >
                          {String(r.user_id || '?').slice(0, 2)}
                        </div>

                        {/* main */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                            <span style={{ fontWeight: 600 }}>Користувач #{r.user_id}</span>
                            {created && <span style={{ color: '#6b7280', fontSize: 12 }}>{created}</span>}
                            <span
                              style={{
                                marginLeft: 'auto',
                                fontSize: 12,
                                fontWeight: 600,
                                color: badge.color,
                                background: badge.bg,
                                border: `1px solid ${badge.border}`,
                                borderRadius: 999,
                                padding: '2px 8px',
                              }}
                            >
                              {r.sentiment}
                            </span>
                          </div>
                          {/* stars */}
                          <div style={{ color: '#F59E0B', marginTop: 4, fontSize: 16 }}>{renderStars(stars)}</div>
                          {/* text */}
                          <p style={{ margin: '8px 0 0', lineHeight: 1.6, color: '#111827' }}>{r.text}</p>
                          {/* scores */}
                          <div style={{ marginTop: 8, color: '#6b7280', fontSize: 12 }}>
                            Позитив: {r.pos_score.toFixed(2)} • Негатив: {r.neg_score.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            </>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
