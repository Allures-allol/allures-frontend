'use client';

import styles from './header.module.css';
import { FaHeart, FaShoppingBag, FaUser, FaBars } from 'react-icons/fa';
import React, { useEffect, useState, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Box, Autocomplete, TextField, CircularProgress, Popper, IconButton, ListItem, ListItemAvatar, Avatar, ListItemText, Paper, List, ListItemButton } from '@mui/material';
import ClickAwayListener from '@mui/material/ClickAwayListener';

import SearchRoundedIcon from '@mui/icons-material/SearchRounded';

// ---- Local types ----
export type Category = {
  id: number | string;
  name: string;
  description?: string | null;
  /** Legacy/back-compat field some APIs may return */
  category_id?: number | null;
};

export type Product = {
  id: number | string;
  name: string;
  image: string | null;
  price: number | null;
  category_id?: number | null;
};

// Helper: read Allures JWT from localStorage (supports several common key names)
const getStoredAlluresToken = (): string | null => {
  if (typeof window === 'undefined') return null;
  const keys = ['allures_jwt', 'alluresJwt', 'authToken', 'token', 'jwt'];
  for (const k of keys) {
    const v = localStorage.getItem(k);
    if (v && String(v).trim()) return String(v).trim();
  }
  // As a fallback, scan for any value that looks like a JWT (xxx.yyy.zzz)
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i) as string;
      const val = localStorage.getItem(key) || '';
      if (/\b[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/.test(val)) return val.trim();
    }
  } catch {}
  return null;
};

// Robust product search that works through local proxies first and then falls back to public API.
async function searchProducts(query: string, signal?: AbortSignal): Promise<Product[]> {
  const q = query.trim();
  if (!q) return [];

  // Normalization helper for case-insensitive, diacritics-insensitive, trimmed matching
  const norm = (s: any) => String(s ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If user typed a numeric ID, try to fetch that exact product and return it alone
  if (/^\d+$/.test(q)) {
    const singleEndpoints = [
      `https://api.alluresallol.com/product/${q}`,
      `https://api.alluresallol.com/product/${q}/`,
 //     `https://api.alluresallol.com/product/products/${q}`,
 //     `https://api.alluresallol.com/product/products/${q}/`,
      `https://api.alluresallol.com/product?id=${encodeURIComponent(q)}`,
    ];
    const tryFetchSingle = async (url: string) => {
      try {
        const ctrl = new AbortController();
        const timer = setTimeout(() => ctrl.abort(), 10000);
        const r = await fetch(url, { signal: ctrl.signal, cache: 'no-store', headers: { accept: 'application/json' } });
        clearTimeout(timer);
        if (!r.ok) return null;
        const data = await r.json();
        const arr = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data?.results)
          ? data.results
          : Array.isArray(data?.products)
          ? data.products
          : Array.isArray(data)
          ? data
          : [];
        const obj = (!Array.isArray(data) && typeof data === 'object') ? data : null;
        const raw = obj && (obj.id !== undefined || obj.name !== undefined)
          ? obj
          : (arr.find((p: any) => String(p?.id) === q) || null);
        if (!raw) return null;
        return [{
          id: raw?.id ?? raw?.product_id ?? (raw?.slug ? String(raw.slug) : ''),
          name: raw?.name ?? raw?.title ?? '',
          image: raw?.image ?? (Array.isArray(raw?.images) ? raw.images[0] : null) ?? null,
          price: typeof raw?.price === 'number' ? raw.price : (raw?.price ? Number(raw.price) : null),
          category_id: raw?.category_id ?? null,
        } as Product];
      } catch {
        return null;
      }
    };
    for (const u of singleEndpoints) {
      const one = await tryFetchSingle(u);
      if (one && one.length) return one;
    }
  }

  const endpoints = [
    // ✅ Use the root endpoint you specified first
    `https://api.alluresallol.com/product/?search=${encodeURIComponent(q)}`,
    `https://api.alluresallol.com/product/?q=${encodeURIComponent(q)}`,
    // Fallback to root without query (we will filter client-side)
    `https://api.alluresallol.com/product/`,
    `https://api.alluresallol.com/product`,
    // Additional known list endpoints as secondary options
//    `https://api.alluresallol.com/product/products/?search=${encodeURIComponent(q)}&limit=50&offset=0&sort=-id`,
//    `https://api.alluresallol.com/product/products/?q=${encodeURIComponent(q)}&limit=50&offset=0&sort=-id`,
    // Local proxies (keep last to avoid 404 noise if not configured)
    `/api/search?q=${encodeURIComponent(q)}&limit=50&offset=0&sort=-id`,
    `/api/product/products?search=${encodeURIComponent(q)}&limit=50&offset=0&sort=-id`,
    `/api/product/products?q=${encodeURIComponent(q)}&limit=50&offset=0&sort=-id`,
    // Full dump fallbacks (client-side filter)
    `/api/products-all`,
    `https://api.alluresallol.com/product/all`,
  ];

  const mapList = (data: any): any[] => {
    if (Array.isArray(data?.items)) return data.items;
    if (Array.isArray(data?.results)) return data.results;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.products)) return data.products;
    if (Array.isArray(data)) return data;
    return [];
  };

  const mapProduct = (it: any): Product => ({
    id: it?.id ?? it?.product_id ?? (it?.slug ? String(it.slug) : ''),
    name: it?.name ?? it?.title ?? '',
    image: it?.image ?? (Array.isArray(it?.images) ? it.images[0] : null) ?? null,
    price: typeof it?.price === 'number' ? it.price : (it?.price ? Number(it.price) : null),
    category_id: it?.category_id ?? null,
  });

  for (const url of endpoints) {
    try {
      const res = await fetch(url, { signal, cache: 'no-store', headers: { accept: 'application/json' } });
      if (!res.ok) continue;
      const json = await res.json();
      let list = mapList(json).map(mapProduct);

      // 1) Exact match by normalized product name → return only that one item
      const nQ = norm(q);
      const exact = list.find((p) => norm(p.name) === nQ);
      if (exact) return [exact];

      // 2) Otherwise, client-side contains filtering by normalized name
      let filtered = list.filter((p) => norm(p.name).includes(nQ));
      if (filtered.length) list = filtered;

      // Limit suggestions to keep dropdown tidy
      if (list.length > 10) list = list.slice(0, 10);
      if (list.length) return list;
    } catch {
      // try next candidate
    }
  }
  return [];
}

// Helper to fetch **all** categories with robust fallbacks (no assumptions about shape)
async function fetchAllCategories(): Promise<Category[]> {
  const candidates = [
    // локальний проксі через rewrites у next.config.ts (уникає CORS)
    '/api/categories',
    '/api/categories/',
    // як фолбек — прямі адреси
    'https://api.alluresallol.com/product/categories',
    'https://api.alluresallol.com/product/categories/',
//    'https://api.alluresallol.com/product/products/categories',
  ];

  const tryMap = (json: any): Category[] => {
    const arrays: any[] = [
      Array.isArray(json) ? json : null,
      Array.isArray(json?.items) ? json.items : null,
      Array.isArray(json?.results) ? json.results : null,
      Array.isArray(json?.data) ? json.data : null,
      Array.isArray(json?.categories) ? json.categories : null,
    ].filter(Boolean) as any[];

    const first = arrays[0] || [];
    return first
      .map((c: any) => ({
        id: c?.id ?? c?.category_id ?? c?.slug ?? c?.value ?? '',
        name: c?.name ?? c?.title ?? c?.label ?? '',
        description: c?.description ?? null,
        category_id: c?.category_id ?? (typeof c?.id === 'number' ? c.id : null),
      }))
      .filter((c: Category) => c && c.name);
  };

  // 1) Без параметров (часто 405/400 возникают из-за query-строки)
  for (const url of candidates) {
    try {
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) continue;
      const json = await res.json();
      const mapped = tryMap(json);
      if (mapped.length) {
        // стабилизируем список: уникализируем по id и сортируем по имени
        const seen = new Set<string>();
        const deduped = mapped.filter((c) => {
          const key = String(c.id ?? c.category_id ?? c.name);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return deduped.sort((a, b) => a.name.localeCompare(b.name, 'uk'));
      }
    } catch (e) {
      // пробуем следующий вариант
    }
  }

  // 2) Попытка с крупным лимитом (если API всё же ждёт limit/offset)
  for (const base of candidates) {
    try {
      const res = await fetch(`${base}?limit=1000&offset=0`, { cache: 'no-store' });
      if (!res.ok) continue;
      const json = await res.json();
      const mapped = tryMap(json);
      if (mapped.length) {
        const seen = new Set<string>();
        const deduped = mapped.filter((c) => {
          const key = String(c.id ?? c.category_id ?? c.name);
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        return deduped.sort((a, b) => a.name.localeCompare(b.name, 'uk'));
      }
    } catch {}
  }

  // 2.5) Фолбек: отримуємо категорії з переліку товарів (/product/all)
  try {
    const res = await fetch('/api/products-all', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      const arr: any[] = Array.isArray(json)
        ? json
        : Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json?.results)
        ? json.results
        : [];

      const map = new Map<string, Category>();
      for (const p of arr) {
        const cid = p?.category_id ?? null;
        const cname = p?.category_name ?? null;
        if (cid != null || cname) {
          const key = String(cid ?? cname);
          if (!map.has(key)) {
            map.set(key, {
              id: cid ?? key,
              name: cname ?? key,
              description: null,
              category_id: typeof cid === 'number' ? cid : null,
            });
          }
        }
      }
      const derived = Array.from(map.values()).filter((c) => c && c.name);
      if (derived.length) {
        return derived.sort((a, b) => a.name.localeCompare(b.name, 'uk'));
      }
    }
  } catch {}

  // 2.6) Останній фолбек: напряму з зовнішнього /product/all (може впертися у CORS у браузері)
  try {
    const res = await fetch('https://api.alluresallol.com/product/categories', { cache: 'no-store' });
    if (res.ok) {
      const json = await res.json();
      const arr: any[] = Array.isArray(json)
        ? json
        : Array.isArray((json as any)?.items)
        ? (json as any).items
        : Array.isArray((json as any)?.results)
        ? (json as any).results
        : [];

      const map = new Map<string, Category>();
      for (const p of arr) {
        const cid = (p as any)?.category_id ?? null;
        const cname = (p as any)?.description ?? null;
        if (cid != null || cname) {
          const key = String(cid ?? cname);
          if (!map.has(key)) {
            map.set(key, {
              id: cid ?? key,
              name: String(cname ?? key),
              description: String(cname ?? key),
              category_id: typeof cid === 'number' ? cid : null,
            });
          }
        }
      }
      const derived = Array.from(map.values()).filter((c) => c && c.name);
      if (derived.length) {
        return derived.sort((a, b) => a.name.localeCompare(b.name, 'uk'));
      }
    }
  } catch {}

  // 3) Если всё пусто — лог и пустой массив
  if (process.env.NODE_ENV !== 'production') {
    console.error('[categories] список пуст. Возможны причины: CORS, другой формат ответа, нет данных.');
  }
  return [];
}

export default function Header() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [catAnchorEl, setCatAnchorEl] = useState<HTMLElement | null>(null);
  const catalogBtnRef = useRef<HTMLDivElement | null>(null);
  const openCats = Boolean(catAnchorEl);
  const handleToggleCats = (e?: React.MouseEvent<HTMLElement>) => {
    setCatAnchorEl(prev => (prev ? null : (e?.currentTarget || catalogBtnRef.current)));
  };
  const handleCloseCats = () => setCatAnchorEl(null);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [options, setOptions] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [categoriesLoading, setCategoriesLoading] = useState(false);

  // Hover intent timer for the categories dropdown
  const hoverTimerRef = useRef<number | null>(null);
  const cancelClose = () => {
    if (hoverTimerRef.current) {
      window.clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }
  };
  const scheduleClose = () => {
    cancelClose();
    hoverTimerRef.current = window.setTimeout(() => setCatAnchorEl(null), 120);
  };

  useEffect(() => {
    const token = getStoredAlluresToken();
    setIsAuthenticated(!!token);
  }, []);

  const handleUserClick = () => {
    const token = getStoredAlluresToken();
    if (token) {
      router.push('/profile');
    } else {
      router.push('/auth');
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setCategoriesLoading(true);
        const cats = await fetchAllCategories();
        if (alive) setCategories(cats);
      } catch (err) {
        console.error('Не вдалося отримати категорії:', err);
        if (alive) setCategories([]);
      } finally {
        if (alive) setCategoriesLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const q = inputValue.trim();
    if (q.length < 3) { setOptions([]); return; }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setLoading(true);
      try {
        const list = await searchProducts(q, controller.signal);
        setOptions(list);
      } catch (e: any) {
        if (e?.name !== 'AbortError') console.error('MUI search fetch error:', e);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [inputValue]);

  return (
    <header className={styles.header}>
      <div className={styles.topBar}>
        <div className={styles.leftLinks}>
          <span>📍 Київ</span>
          <a href="/about">Про нас</a>
          <a href="#" className={styles.activeLink}>Акції</a>
          <a href="#">Новини</a>
          <a href="/support">Служба підтримки</a>
        </div>
        <div className={styles.phoneNumber}>(044) 202 22 00</div>
      </div>

      <div className={styles.middleBar}>
        <div className={styles.logo}>
          <Link href="/">
            <Image
              src="/logo.png"
              alt="Allures Logo"
              width={60}
              height={46}
            />
          </Link>
        </div>

        <div className={styles.searchBlock}>
          <Box sx={{ display: 'flex', alignItems: 'center', flex: 1, minWidth: 0 }}>
            <Autocomplete
              fullWidth
              freeSolo
              options={options}
              loading={loading}
              value={null}
              inputValue={inputValue}
              onInputChange={(_, v) => setInputValue(v)}
              getOptionLabel={(opt: any) => (typeof opt === 'string' ? opt : opt?.name ?? '')}
              filterOptions={(x) => x}
              isOptionEqualToValue={(o, v) => String(o?.id) === String((v as any)?.id)}
              noOptionsText="Не знайдено"
              onChange={(_, value: any) => {
                if (value && value.id != null) {
                  router.push(`/products/${value.id}`);
                } else if (inputValue.trim()) {
                  router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`);
                }
              }}
              renderOption={(props, option: any) => (
                <li {...props} key={String(option.id)}>
                  <ListItem component="div" dense disableGutters sx={{ px: 1 }}>
                    <ListItemAvatar sx={{ minWidth: 36 }}>
                      <Avatar
                        variant="rounded"
                        src={option.image || undefined}
                        sx={{ width: 24, height: 24 }}
                        imgProps={{ width: 24, height: 24, decoding: 'async', loading: 'eager', draggable: false }}
                      >
                        🛍️
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={option.name}
                      secondary={typeof option.price === 'number' ? `${option.price.toLocaleString('uk-UA')} ₴` : undefined}
                      primaryTypographyProps={{ noWrap: true }}
                      secondaryTypographyProps={{ noWrap: true }}
                    />
                  </ListItem>
                </li>
              )}
              renderInput={(params) => (
                <TextField
                  {...params}
                  placeholder="Шукати товари..."
                  InputProps={{
                    ...params.InputProps,
                    endAdornment: (
                      <>
                        {loading ? <CircularProgress size={18} /> : null}
                        {params.InputProps.endAdornment}
                      </>
                    ),
                  }}
                />
              )}
              PopperComponent={(popperProps) => <Popper {...popperProps} sx={{ width: '100%' }} />}
            />
            <IconButton
              aria-label="search"
              onClick={() => {
                const q = inputValue.trim();
                if (!q) return;
                // If numeric ID — go straight to product page
                if (/^\d+$/.test(q)) { router.push(`/products/${q}`); return; }
                // If exactly one option and it matches the query by name — go to that product
                const exact = options.find(o => (o?.name || '').toLowerCase() === q.toLowerCase());
                if (exact) { router.push(`/products/${exact.id}`); return; }
                // Otherwise open the search page
                router.push(`/search?q=${encodeURIComponent(q)}`);
              }}
            >
              <SearchRoundedIcon />
            </IconButton>
          </Box>
        </div>

        <div className={styles.iconBlock}>
          <FaHeart
            aria-label="Wishlist"
            title="Список бажань"
            style={{ cursor: 'pointer' }}
            onClick={() => router.push('/wishlist')}
          />
          <FaShoppingBag
            aria-label="Cart"
            style={{ cursor: 'pointer' }}
            onClick={() => router.push('/cart')}
          />
          <FaUser
            onClick={handleUserClick}
            style={{ cursor: 'pointer' }}
          />
        </div>
      </div>

      <div
        ref={catalogBtnRef}
        className={styles.catalogBar}
        onClick={(e) => handleToggleCats(e)}
        onMouseEnter={(e) => { cancelClose(); setCatAnchorEl(e.currentTarget as HTMLElement); }}
        onMouseLeave={scheduleClose}
        aria-haspopup="menu"
        aria-expanded={openCats ? 'true' : 'false'}
        role="button"
      >
        <div className={styles.catalogContent}>
          <FaBars className={styles.catalogIcon} />
          <span className={styles.catalogText}>Каталог товарів</span>
        </div>
      </div>

      <Popper open={openCats} anchorEl={catAnchorEl} placement="bottom-start" sx={{ zIndex: 1300, width: 420 }}>
        <ClickAwayListener onClickAway={handleCloseCats}>
          <Paper
            elevation={3}
            sx={{ maxHeight: '70vh', overflowY: 'auto', p: 1 }}
            onMouseEnter={cancelClose}
            onMouseLeave={scheduleClose}
          >
            {categoriesLoading ? (
              <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={18} /> Завантаження...
              </Box>
            ) : (
              <List dense disablePadding>
                {(!categoriesLoading && categories.length === 0) && (
                  <Box sx={{ p: 2, color: '#6b7280' }}>Категорії відсутні або тимчасово недоступні</Box>
                )}
                {categories.map((cat) => {
                  const cid = (typeof cat.category_id === 'number'
                    ? cat.category_id
                    : (typeof cat.id === 'number' ? cat.id : (cat.id ?? cat.name)));
                  return (
                    <Link
                      key={String(cid)}
                      href={`/products?category=${encodeURIComponent(String(cid))}`}
                      onClick={handleCloseCats}
                      className={styles.dropdownItem}
                      style={{ textDecoration: 'none', color: 'inherit' }}
                      prefetch={false}
                    >
                      <ListItemButton>
                        <ListItemText
                          primary={(cat.description && cat.description.trim()) ? cat.description : cat.name}
                          secondary={(cat.description && cat.name && cat.description.trim() !== cat.name.trim()) ? cat.name : undefined}
                          primaryTypographyProps={{ noWrap: true }}
                          secondaryTypographyProps={{ noWrap: true }}
                        />
                      </ListItemButton>
                    </Link>
                  );
                })}
              </List>
            )}
          </Paper>
        </ClickAwayListener>
      </Popper>
    </header>
  );
}
