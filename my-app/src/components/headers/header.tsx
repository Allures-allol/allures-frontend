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

// Helper to fetch **all** categories with robust fallbacks (no assumptions about shape)
async function fetchAllCategories(): Promise<Category[]> {
  const candidates = [
    // локальний проксі через rewrites у next.config.ts (уникає CORS)
    '/api/categories',
    '/api/categories/',
    // як фолбек — прямі адреси
    'https://api.alluresallol.com/product/categories',
    'https://api.alluresallol.com/product/categories/',
    'https://api.alluresallol.com/product/products/categories',
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
    // Example: check for an auth token in localStorage
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(!!token);
  }, []);

  const handleUserClick = async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;
      if (!token) {
        router.push('/auth');
        return;
      }
      const res = await fetch('https://api.alluresallol.com/auth/me', {
        headers: {
          Authorization: `Bearer ${token}`,
          accept: 'application/json',
        },
        cache: 'no-store',
      });
      if (res.ok) {
        router.push('/profile');
      } else {
        // токен недействителен — очищаем и отправляем на авторизацию
        localStorage.removeItem('authToken');
        router.push('/auth');
      }
    } catch {
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
    const t = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(
          `https://api.alluresallol.com/product/products/?q=${encodeURIComponent(q)}&limit=10&offset=0&sort=-id`,
          { signal: controller.signal, cache: 'no-store', headers: { accept: 'application/json' } }
        );
        const data = await res.json();
        const raw = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        const mapped: Product[] = raw
          .map((it: any) => ({
            id: it?.id ?? it?.product_id ?? (it?.slug ? String(it.slug) : ''),
            name: it?.name ?? '',
            image: it?.image ?? (Array.isArray(it?.images) ? it.images[0] : null) ?? null,
            price: typeof it?.price === 'number' ? it.price : it?.price ? Number(it.price) : null,
            category_id: it?.category_id ?? null,
          }))
          .filter((p: { name: any; }) => p && p.name);
        setOptions(mapped);
      } catch (e: any) {
        if (e?.name !== 'AbortError') console.error('MUI search fetch error:', e);
        setOptions([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => { controller.abort(); clearTimeout(t); };
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
            <IconButton aria-label="search" onClick={() => inputValue.trim() && router.push(`/search?q=${encodeURIComponent(inputValue.trim())}`)}>
              <SearchRoundedIcon />
            </IconButton>
          </Box>
        </div>

        <div className={styles.iconBlock}>
          <FaHeart />
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
                  const cid = (cat.id ?? cat.category_id) as any;
                  return (
                    <Link
                      key={String(cid)}
                      href={`/category/${encodeURIComponent(String(cid))}`}
                      onClick={handleCloseCats}
                      className={styles.dropdownItem}
                      style={{ textDecoration: 'none', color: 'inherit' }}
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