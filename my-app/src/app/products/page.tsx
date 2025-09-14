'use client';
// src/app/products/[category]/page.tsx
import React, { Suspense } from 'react';
import Link from 'next/link';
import Header from './../../components/headers/header';
import Footer from './../../components/footers/footer';
import styles from './products.module.css';
import { useSearchParams, useRouter } from 'next/navigation';
import Image from 'next/image';

const CART_KEY = 'allures_cart_v1';
const WISHLIST_KEY = 'allures_wishlist_v1';
const BRAND_OPTIONS = ['Acer','Apple','ASUS','Dell','HP','Huawei','Lenovo','Microsoft','Samsung','Xiaomi'] as const;


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

type Review = {
  id: number;
  product_id: number;
  user_id: number;
  text: string;
  sentiment?: 'positive' | 'neutral' | 'negative' | string;
  pos_score?: number;
  neg_score?: number;
  created_at?: string;
};

// Safe image src builder for API paths
const imgSrc = (src?: string | null) => {
  if (!src) return '/placeholder.png';
  const trimmed = String(src).trim();
  // Avoid requesting directory-like paths that 404 (e.g., "/product/" or any trailing slash)
  if (!trimmed || /^(\/)?product\/?$/i.test(trimmed) || /\/$/.test(trimmed)) {
    return '/placeholder.png';
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://api.alluresallol.com${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

/**
 * Витягує відгуки для товару і рахує рейтинг 0..5 (за pos/neg score або sentiment).
 * Працює напряму до бекенду. Якщо CORS блокує — повертає 0.
 */
async function getRatingForProduct(productId: number, signal?: AbortSignal): Promise<number> {
  try {
    const url = `https://api.alluresallol.com/review/product/${productId}`;
    const res = await fetch(url, { method: 'GET', cache: 'no-store', signal });
    if (!res.ok) return 0;
    const data = await res.json();

    const reviews: Review[] = Array.isArray(data)
      ? data
      : Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.results)
      ? data.results
      : [];

    if (!reviews.length) return 0;

    // Обчислюємо середній «позитив» і мапимо на 0..5
    const scores = reviews.map((r) => {
      const pos = typeof r.pos_score === 'number' ? r.pos_score : undefined;
      const neg = typeof r.neg_score === 'number' ? r.neg_score : undefined;
      if (typeof pos === 'number' && typeof neg === 'number' && pos + neg > 0) {
        return pos / (pos + neg); // 0..1
      }
      // fallback за sentiment
      switch ((r.sentiment || '').toLowerCase()) {
        case 'positive':
          return 0.9;
        case 'neutral':
          return 0.5;
        case 'negative':
          return 0.1;
        default:
          return 0.5;
      }
    });

    const avg = scores.reduce((a, b) => a + b, 0) / scores.length; // 0..1
    const stars = Math.round(avg * 5 * 2) / 2; // крок 0.5
    return Math.max(0, Math.min(5, stars));
  } catch {
    return 0;
  }
}

function Stars({ value }: { value: number }) {
  // малюємо 5 зірок з половинками
  const full = Math.floor(value);
  const half = value - full >= 0.5 ? 1 : 0;
  const empty = 5 - full - half;
  const starStyle: React.CSSProperties = { color: '#f59e0b', marginRight: 2, fontSize: 14, lineHeight: 1 };
  return (
    <span aria-label={`Рейтинг ${value} з 5`} title={`Рейтинг ${value} з 5`} style={{ display: 'inline-flex', alignItems: 'center' }}>
      {Array.from({ length: full }).map((_, i) => (
        <span key={`f${i}`} style={starStyle}>★</span>
      ))}
      {half === 1 && <span style={starStyle}>☆</span>}
      {Array.from({ length: empty }).map((_, i) => (
        <span key={`e${i}`} style={starStyle}>☆</span>
      ))}
      <span style={{ marginLeft: 6, fontSize: 12, color: '#6b7280' }}>{value ? value.toFixed(1) : '—'}</span>
    </span>
  );
}

function getProductsByCategory(
  category: string
): Promise<{ products: Product[]; total: number }> {
  const qs = `offset=0&limit=1000&sort=-id`;
  // Некоторые конфигурации серверов отдают 405 при наличии лишних слэшей / preflight.
  // Делаем несколько попыток с разными URL без дополнительных заголовков.
  const candidates = [
    `https://api.alluresallol.com/product/`,
    `https://api.alluresallol.com/product`,
  //  `https://api.alluresallol.com/product/products?${qs}`,
  //  `https://api.alluresallol.com/product/products/?${qs}`,
  ];

  const tryFetch = async (url: string): Promise<{ data: any | null; error: string | null }> => {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 12000);
      const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        signal: ctrl.signal,
      });
      clearTimeout(timer);
      if (!res.ok) {
        const raw = await res.text().catch(() => '');
        return { data: null, error: `HTTP ${res.status} ${res.statusText} :: ${raw.slice(0, 160)}` };
      }
      const json = await res.json();
      return { data: json, error: null };
    } catch (e: any) {
      console.warn('[products] fetch failed:', e?.message || e);
      return { data: null, error: e?.message || 'Failed to fetch' };
    }
  };

  return (async () => {
    let data: any = null;
    let lastErr: string | null = null;
    for (const u of candidates) {
      const r = await tryFetch(u);
      if (r.data) { data = r.data; break; }
      lastErr = r.error;
    }
    if (!data) {
      console.error('API error (category):', lastErr);
      return { products: [], total: 0 };
    }
  
    const list: any[] = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data?.products)
      ? data.products
      : Array.isArray(data)
      ? data
      : [];

    // Фильтрация по категории: по имени категории или её id
    const normalized = (category || '').toString().trim().toLowerCase();
    const imageFiltered = list.filter((p: any) => p?.image && String(p.image).trim() !== '');

    const filtered = normalized
      ? imageFiltered.filter((p: any) => {
          const name = (p.category_name || '').toString().toLowerCase();
          const idStr = (p.category_id != null ? String(p.category_id) : '').toLowerCase();
          return name === normalized || idStr === normalized;
        })
      : imageFiltered;

    return {
      products: filtered.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        old_price: p.old_price,
        image: p.image,
        is_discount: p.is_discount,
      })),
      total: filtered.length,
    };
  })().catch((err) => {
    console.error('Ошибка при загрузке товарів:', err);
    return { products: [], total: 0 };
  });
}

async function getAllProducts(): Promise<{ products: Product[]; total: number }> {
  // Используем рабочий листинг вместо /product/all (даёт 405)
  const qs = `offset=0&limit=1000&sort=-id`;
  const candidates = [
    `https://api.alluresallol.com/product/`,
    `https://api.alluresallol.com/product`,
  //  `https://api.alluresallol.com/product/products?${qs}`,
  //  `https://api.alluresallol.com/product/products/?${qs}`,
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
      console.warn('[products] fetch failed:', e?.message || e);
      return { data: null, error: e?.message || 'Failed to fetch' };
    }
  };

  try {
    let data: any = null;
    let lastErr: string | null = null;
    for (const u of candidates) {
      const r = await tryFetch(u);
      if (r.data) { data = r.data; break; }
      lastErr = r.error;
    }
    if (!data) {
      console.error('API error /product/products:', lastErr);
      return { products: [], total: 0 };
    }
  
    const list: any[] = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data?.results)
      ? data.results
      : Array.isArray(data?.products)
      ? data.products
      : Array.isArray(data)
      ? data
      : [];

    // Только с валидной картинкой (не директория и не пусто)
    const withImage = list.filter((p: any) => {
      const s = String(p?.image ?? '').trim();
      return s !== '' && !/^(\/)?product\/?$/i.test(s) && !/\/$/.test(s);
    });

    const mapped: Product[] = withImage.map((p: any) => ({
      id: Number(p.id),
      company_id: p.company_id ?? undefined,
      name: String(p.name ?? ''),
      description: p.description ?? undefined,
      price: Number(p.price ?? 0),
      status: p.status ?? undefined,
      current_inventory: typeof p.current_inventory === 'number' ? p.current_inventory : undefined,
      category_id: typeof p.category_id === 'number' ? p.category_id : undefined,
      category_name: p.category_name ?? undefined,
      old_price: typeof p.old_price === 'number' ? p.old_price : undefined,
      image: String(p.image),
      subcategory: p.subcategory ?? undefined,
      product_type: p.product_type ?? undefined,
      is_hit: Boolean(p.is_hit),
      is_discount: Boolean(p.is_discount),
      is_new: Boolean(p.is_new),
      created_at: p.created_at ?? undefined,
      updated_at: p.updated_at ?? undefined,
    }));

    return { products: mapped, total: mapped.length };
  } catch (err) {
    console.error('Ошибка при загрузке всех товаров (/product/products):', err);
    return { products: [], total: 0 };
  }
}

function CategoryPageInner({ params }: any) {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);
  const [ratings, setRatings] = React.useState<Record<number, number>>({});
  const [wishlist, setWishlist] = React.useState<number[]>([]);

  const [selectedBrands, setSelectedBrands] = React.useState<Set<string>>(new Set());
  const router = useRouter();

  const toggleBrand = React.useCallback((b: string) => {
    setSelectedBrands(prev => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b); else next.add(b);
      return next;
    });
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const url = new URL(window.location.href);
    const currentOffset = url.searchParams.get('offset') || '0';
    if (currentOffset !== '0') {
      url.searchParams.set('offset', '0');
      router.replace(url.pathname + '?' + url.searchParams.toString());
    }
  }, [selectedBrands, router]);

  const getBrandFromName = React.useCallback((p: Product): string => {
    const name = (p.name || '').toLowerCase();
    const found = BRAND_OPTIONS.find(b => name.includes(b.toLowerCase()));
    return found || 'Other';
  }, []);

  const searchParams = useSearchParams();
  const offsetParam = React.useMemo(() => {
    const v = parseInt(searchParams.get('offset') || '0', 10);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  }, [searchParams]);
  const limitParam = React.useMemo(() => {
    const v = parseInt(searchParams.get('limit') || '20', 10);
    return Number.isFinite(v) && v > 0 ? v : 20;
  }, [searchParams]);

  React.useEffect(() => {
    const hasCategory = Boolean(params?.category);
    const loader = hasCategory
      ? getProductsByCategory(params.category)
      : getAllProducts();

    loader
      .then(({ products, total }) => {
        setProducts(products);
        setTotalCount(total);
        if (process.env.NODE_ENV !== 'production') {
          console.log('[Products] loaded:', { total, pageCount: products.length, offset: offsetParam, limit: limitParam });
        }
      })
      .catch((e) => console.error('Load products error:', e));
  }, [params?.category, offsetParam, limitParam]);

  React.useEffect(() => {
    if (!products || products.length === 0) return;
    const toLoad = products
      .map(p => p.id)
      .filter((id) => ratings[id] == null);
    if (toLoad.length === 0) return;
    const ctrl = new AbortController();
    (async () => {
      const entries = await Promise.all(
        toLoad.map(async (id) => {
          const r = await getRatingForProduct(id, ctrl.signal).catch(() => 0);
          return [id, r] as const;
        })
      );
      setRatings((prev) => {
        const next = { ...prev };
        for (const [id, r] of entries) next[id] = r;
        return next;
      });
    })();
    return () => ctrl.abort();
  }, [products]);

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

  const syncWishlistIds = React.useCallback(() => {
    const arr = readWishlist();
    const ids = arr.map((x: any) => Number(x?.id)).filter((v: any) => Number.isFinite(v));
    setWishlist(ids);
  }, [readWishlist]);

  React.useEffect(() => {
    // initial load
    syncWishlistIds();
    const onStorage = (e: StorageEvent) => {
      if (!e || e.key === null || e.key === WISHLIST_KEY) syncWishlistIds();
    };
    const onCustom = () => syncWishlistIds();
    window.addEventListener('storage', onStorage);
    window.addEventListener('wishlist:changed', onCustom as any);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('wishlist:changed', onCustom as any);
    };
  }, [syncWishlistIds]);

  const isInWishlist = React.useCallback((id: number) => wishlist.includes(Number(id)), [wishlist]);

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
      const ids = arr.map((x: any) => Number(x?.id)).filter((v: any) => Number.isFinite(v));
      setWishlist(ids);
    } catch (e) {
      console.error('toggleWishlist error:', e);
    }
  }, [readWishlist, writeWishlist]);

  const handleAddToCart = React.useCallback((p: Product) => {
    try {
      const raw = window.localStorage.getItem(CART_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const idx = Array.isArray(list) ? list.findIndex((x: any) => Number(x?.id) === Number(p.id)) : -1;
      if (idx >= 0) {
        const current = list[idx]?.qty || 1;
        list[idx].qty = Math.min(99, current + 1);
      } else {
        list.push({
          id: p.id,
          name: p.name,
          price: p.price,
          old_price: typeof p.old_price === 'number' ? p.old_price : null,
          image: p.image || null,
          qty: 1,
          category_name: p.category_name || null,
        });
      }
      window.localStorage.setItem(CART_KEY, JSON.stringify(list));
      window.dispatchEvent(new Event('cart:changed'));
    } catch (e) {
      console.error('addToCart error:', e);
    }
  }, []);

  // ---- Category chips (UX filter by product category, robust)
  const CATEGORY_CHIPS = [
    { key: 'all', label: 'Усі категорії' },
    { key: 'fashion', label: 'Мода та одяг' },
    { key: 'electronics', label: 'Електроніка' },
    { key: 'sport', label: 'Спорт' },
    { key: 'toys', label: 'Іграшки та діти' },
    { key: 'beauty', label: 'Краса' },
    { key: 'furniture', label: 'Меблі/Дім' },
  ] as const;

  // ---- Category chips predicates (robust matching by category_name/name/etc.)
  const norm = (s?: string) => (s || '').toLowerCase();
  const hasAny = (src: string, keys: string[]) => keys.some(k => src.includes(k));

  const CHIP_PREDICATES: Record<(typeof CATEGORY_CHIPS)[number]['key'], (p: Product) => boolean> = {
    all: () => true,
    fashion: (p) => {
      const c = norm(p.category_name);
      const n = norm(p.name);
      const d = norm(p.description);
      return (
        hasAny(c, ['fashion', 'clothes', 'apparel']) ||
        hasAny(n, ['dress', 'shirt', 'shoes', 'sneakers', 'bag', 'рюкзак', 'курт', 'взут', 'одяг']) ||
        hasAny(d, ['одяг', 'взут', 'аксесуар'])
      );
    },
    electronics: (p) => {
      const c = norm(p.category_name);
      const n = norm(p.name);
      const d = norm(p.description);
      const t = norm(p.product_type);
      return (
        hasAny(c, ['electr', 'gadget', 'computer', 'laptop', 'phone', 'tablet']) ||
        hasAny(t, ['phone', 'tablet', 'laptop', 'pc']) ||
        hasAny(n + ' ' + d, ['iphone', 'ipad', 'mac', 'android', 'ноут', 'планшет', 'смартфон'])
      );
    },
    sport: (p) => {
      const c = norm(p.category_name);
      const n = norm(p.name);
      const d = norm(p.description);
      return hasAny(c + ' ' + n + ' ' + d, ['sport', 'sports', 'фітнес', 'спорт', 'тренаж', 'м\'яч']);
    },
    toys: (p) => {
      const c = norm(p.category_name);
      const n = norm(p.name);
      const d = norm(p.description);
      return hasAny(c + ' ' + n + ' ' + d, ['toy', 'іграш', 'kids', 'child']);
    },
    beauty: (p) => {
      const c = norm(p.category_name);
      const n = norm(p.name);
      const d = norm(p.description);
      const sc = norm(p.subcategory);
      return (
        hasAny(c + ' ' + sc, ['beauty', 'cosmetic', 'skin', 'hair']) ||
        hasAny(n + ' ' + d, ['крем', 'маска', 'шампун', 'міцел', 'догляд'])
      );
    },
    furniture: (p) => {
      const c = norm(p.category_name);
      const n = norm(p.name);
      const d = norm(p.description);
      return hasAny(c + ' ' + n + ' ' + d, ['furniture', 'home', 'decor', 'диван', 'стіл', 'стілець', 'шафа', 'мебл']);
    },
  };

  // Sync chipCategory with route param (if provided)
  const [chipCategory, setChipCategory] = React.useState<(typeof CATEGORY_CHIPS)[number]['key']>(() => {
    const paramKey = String(params?.category || '').toLowerCase();
    return CATEGORY_CHIPS.some((c) => c.key === paramKey) ? (paramKey as any) : 'all';
  });

  React.useEffect(() => {
    const paramKey = String(params?.category || '').toLowerCase();
    if (CATEGORY_CHIPS.some((c) => c.key === paramKey)) {
      setChipCategory(paramKey as any);
    }
  }, [params?.category]);

  // Apply client-side brand filtering
  const filteredProducts = React.useMemo(() => {
    if (!selectedBrands || selectedBrands.size === 0) return products;
    return products.filter(p => selectedBrands.has(getBrandFromName(p)));
  }, [products, selectedBrands, getBrandFromName]);

  // Apply robust chip category filtering
  const chipFiltered = React.useMemo(() => {
    const pred = CHIP_PREDICATES[chipCategory];
    return filteredProducts.filter(pred);
  }, [filteredProducts, chipCategory]);

  // Derive pagination on the result
  const effectiveTotal = chipFiltered.length;
  const pageSize = limitParam;
  const pageCount = Math.max(1, Math.ceil(effectiveTotal / pageSize));
  const currentPage = Math.max(1, Math.min(pageCount, Math.floor(offsetParam / pageSize) + 1));
  const startIndex = (currentPage - 1) * pageSize;
  const pageProducts = chipFiltered.slice(startIndex, startIndex + pageSize);

  const basePath = params?.category ? `/products/${params.category}` : '/products';

  return (
    <>
      <Header />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/">🏠</Link>
        <span className={styles.separator}>&gt;</span>
        <Link href="/products">Електроніка</Link>
        <span className={styles.separator}>&gt;</span>
        <span>{params.category}</span>
      </div>

      <main className={styles.main}>
        {/* Sidebar filters */}
        <aside className={styles.sidebar}>
          <div className={styles.filterSection}>
            <h4>Бренд</h4>
            <input type="text" placeholder="Пошук..." className={styles.searchBox} />
            {BRAND_OPTIONS.map(b => (
              <label key={b} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={selectedBrands.has(b)}
                  onChange={() => toggleBrand(b)}
                />{' '}
                {b}
              </label>
            ))}
          </div>
          <div className={styles.filterSection}>
            <h4>Ціна</h4>
            <div className={styles.priceInputs}>
              <input type="number" placeholder="Від" className={styles.priceInput}/>
              <input type="number" placeholder="До" className={styles.priceInput}/>
            </div>
          </div>
          <div className={styles.filterSection}>
            <h4>Об'єм оперативної пам'яті</h4>
            {['4–8 ГБ','8–16 ГБ','16–24 ГБ','24+ ГБ'].map(r => (
              <label key={r} className={styles.checkboxLabel}>
                <input type="checkbox" /> {r}
              </label>
            ))}
          </div>
          <div className={styles.filterSection}>
            <h4>Процесор</h4>
            {['Intel Core i5','Intel Core i7','AMD Ryzen 5','AMD Ryzen 7','M2','M4'].map(p => (
              <label key={p} className={styles.checkboxLabel}>
                <input type="checkbox" /> {p}
              </label>
            ))}
          </div>
          <div className={styles.filterSection}>
            <h4>Діагональ екрану</h4>
            {['12"','13"','14"','15"','16"','17+"'].map(d => (
              <label key={d} className={styles.checkboxLabel}>
                <input type="checkbox" /> {d}
              </label>
            ))}
          </div>
          <div className={styles.filterSection}>
            <h4>ОС</h4>
            {['Windows 10','Windows 11','MacOS','Linux'].map(o => (
              <label key={o} className={styles.checkboxLabel}>
                <input type="checkbox" /> {o}
              </label>
            ))}
          </div>
        </aside>

        {/* Product grid */}
        <section className={styles.products}>
          <h1 className={styles.title}>{params.category}</h1>


          <span className={styles.count}>Знайдено {effectiveTotal} товарів</span>
          <div className={`${styles.grid} threeUp`}>
            {pageProducts.map((p) => (
              <div key={p.id} className={styles.card} style={{ position: 'relative' }}>
                <button
                  type="button"
                  aria-label={isInWishlist(p.id) ? 'Прибрати з обраного' : 'Додати в обране'}
                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleWishlist(p); }}
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 2,
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    border: '1px solid rgba(0,0,0,0.08)',
                    background: 'rgba(255,255,255,0.9)',
                    backdropFilter: 'blur(4px)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                  title={isInWishlist(p.id) ? 'Прибрати з обраного' : 'Додати в обране'}
                >
                  <span style={{ fontSize: 18, lineHeight: 1, color: isInWishlist(p.id) ? '#ef4444' : '#9ca3af' }}>
                    {isInWishlist(p.id) ? '❤' : '♡'}
                  </span>
                </button>
                <Link href={`/products/${p.id}`} className={styles.cardLink} aria-label={p.name}>
                  <Image
                    src={imgSrc(p.image)}
                    alt={p.name}
                    width={600}
                    height={400}
                    unoptimized
                    className={styles.image}
                    style={{ objectFit: 'contain' }}
                  />
                  <h3 className={styles.name}>{p.name}</h3>
                  <div style={{ marginTop: 4 }}>
                    <Stars value={ratings[p.id] ?? 0} />
                  </div>
                </Link>

                <p className={styles.price}>
                  {p.is_discount && (
                    <span className={styles.oldPrice}>
                      {p.old_price?.toLocaleString('uk-UA')} ₴
                    </span>
                  )}
                  <span className={styles.currentPrice}>
                    {p.price.toLocaleString('uk-UA')} ₴
                  </span>
                </p>

                <div style={{ display: 'flex', gap: 8 }}>
                  <Link href={`/products/${p.id}`} className={styles.detailBtn}>
                    Деталі
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleAddToCart(p)}
                    className={styles.detailBtn}
                    aria-label={`Додати ${p.name} до кошика`}
                    style={{ cursor: 'pointer' }}
                  >
                    В кошик
                  </button>
                </div>
              </div>
            ))}
          </div>
          {pageProducts.length === 0 && (
            <div style={{ padding: '12px 0', color: '#6b7280' }}>
              Немає товарів для відображення. Перевірте доступність API або параметри фільтрації.
            </div>
          )}
          {/* Pagination */}
          {(() => {
            const total = effectiveTotal;
            const pageSizeLocal = typeof limitParam === 'number' ? limitParam : 20;
            const currentOffsetLocal = typeof offsetParam === 'number' ? offsetParam : 0;
            const pageCountLocal = Math.max(1, Math.ceil(total / pageSizeLocal));
            const currentPageLocal = Math.max(1, Math.min(pageCountLocal, Math.floor(currentOffsetLocal / pageSizeLocal) + 1));
            const makeUrl = (p: number) => `${basePath}?offset=${(p - 1) * pageSizeLocal}&limit=${pageSizeLocal}`;

            // Build compact list with ellipsis: 1 … (N-1, N, N+1) … last
            const visible: number[] = [];
            const delta = 1;
            for (let i = 1; i <= pageCountLocal; i++) {
              if (i === 1 || i === pageCountLocal || (i >= currentPageLocal - delta && i <= currentPageLocal + delta)) {
                visible.push(i);
              }
            }
            const pagesArr: (number | '...')[] = [];
            let prev = 0;
            for (const v of visible) {
              if (prev && v - prev > 1) pagesArr.push('...');
              pagesArr.push(v);
              prev = v;
            }

            return (
              <nav className={styles.pagination} aria-label="Пагінація товарів">
                <ul className={styles.paginationList}>
                  <li className={styles.pageItem}>
                    <Link
                      className={`${styles.pageButton} ${currentPageLocal === 1 ? styles.disabled : ''}`}
                      aria-disabled={currentPageLocal === 1}
                      href={makeUrl(1)}
                    >
                      « Перша
                    </Link>
                  </li>
                  <li className={styles.pageItem}>
                    <Link
                      className={`${styles.pageButton} ${currentPageLocal === 1 ? styles.disabled : ''}`}
                      aria-disabled={currentPageLocal === 1}
                      href={makeUrl(Math.max(1, currentPageLocal - 1))}
                    >
                      ‹ Назад
                    </Link>
                  </li>

                  {pagesArr.map((p, idx) =>
                    p === '...' ? (
                      <li key={`e${idx}`} className={styles.pageItem}>
                        <span className={styles.ellipsis}>…</span>
                      </li>
                    ) : (
                      <li key={p} className={styles.pageItem}>
                        <Link
                          className={`${styles.pageButton} ${p === currentPageLocal ? styles.active : ''}`}
                          aria-current={p === currentPageLocal ? 'page' : undefined}
                          href={makeUrl(p)}
                        >
                          {p}
                        </Link>
                      </li>
                    )
                  )}

                  <li className={styles.pageItem}>
                    <Link
                      className={`${styles.pageButton} ${currentPageLocal === pageCountLocal ? styles.disabled : ''}`}
                      aria-disabled={currentPageLocal === pageCountLocal}
                      href={makeUrl(Math.min(pageCountLocal, currentPageLocal + 1))}
                    >
                      Вперед ›
                    </Link>
                  </li>
                  <li className={styles.pageItem}>
                    <Link
                      className={`${styles.pageButton} ${currentPageLocal === pageCountLocal ? styles.disabled : ''}`}
                      aria-disabled={currentPageLocal === pageCountLocal}
                      href={makeUrl(pageCountLocal)}
                    >
                      Остання »
                    </Link>
                  </li>
                </ul>
              </nav>
            );
          })()}
        </section>
      </main>

      <Footer />
      <style jsx>{`
        /* Force 3-up grid on tablets & phones */
        @media (max-width: 992px) {
          .threeUp { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
        }
        @media (max-width: 768px) {
          .threeUp { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
        }
        @media (max-width: 480px) {
          .threeUp { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
        }
      `}</style>
    </>
  );
}

export default function ProductsPage(props: any) {
  return (
    <Suspense fallback={<div style={{ padding: 16 }}>Завантаження…</div>}>
      <CategoryPageInner {...props} />
    </Suspense>
  );
}
