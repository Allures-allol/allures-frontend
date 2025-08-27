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

// Helper to fetch **all** categories with robust pagination handling
async function fetchAllCategories(): Promise<Category[]> {
  const base = 'https://api.alluresallol.com/product/products/categories';
  const limit = 100;
  let offset = 0;
  const out: Category[] = [];
  let total: number | null = null;

  for (let page = 0; page < 200; page += 1) { // generous safety cap
    const url = `${base}?limit=${limit}&offset=${offset}`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (!res.ok) break;
    const json = await res.json();

    // Try to read total from common fields if backend provides it
    if (total == null) {
      total =
        (typeof json?.total === 'number' && json.total) ||
        (typeof json?.count === 'number' && json.count) ||
        (typeof json?.pagination?.total === 'number' && json.pagination.total) ||
        null;
    }

    const items: any[] = Array.isArray(json?.items)
      ? json.items
      : Array.isArray(json)
      ? json
      : (json?.results ?? []);

    const batch: Category[] = items
      .map((c: any) => ({
        id: c.id ?? c.category_id ?? c.slug ?? c.value ?? '',
        name: c.name ?? c.title ?? c.label ?? '',
        description: c.description ?? null,
        category_id: c.category_id ?? (typeof c.id === 'number' ? c.id : null),
      }))
      .filter((c: Category) => c && c.name);

    out.push(...batch);

    // Exit conditions:
    // 1) We reached declared total
    if (typeof total === 'number' && out.length >= total) break;
    // 2) Last page smaller than limit
    if (items.length < limit) break;

    offset += limit;
  }

  // If backend returned everything at once (no pagination fields), try a one-shot big request as a fallback
  if (out.length === 0) {
    const resBig = await fetch(`${base}?limit=1000&offset=0`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (resBig.ok) {
      const json = await resBig.json();
      const items: any[] = Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json)
        ? json
        : (json?.results ?? []);
      const batch: Category[] = items
        .map((c: any) => ({
          id: c.id ?? c.category_id ?? c.slug ?? c.value ?? '',
          name: c.name ?? c.title ?? c.label ?? '',
          description: c.description ?? null,
          category_id: c.category_id ?? (typeof c.id === 'number' ? c.id : null),
        }))
        .filter((c: Category) => c && c.name);
      out.push(...batch);
    }
  }

  // de-duplicate and sort by name for stable UI
  const seen = new Set<string>();
  const deduped = out.filter((c) => {
    const key = String(c.id ?? c.category_id ?? '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return deduped.sort((a, b) => a.name.localeCompare(b.name, 'uk')); 
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
      >
        <div className={styles.catalogContent}>
          <FaBars className={styles.catalogIcon} />
          <span className={styles.catalogText}>Каталог товарів</span>
        </div>
      </div>

      <Popper open={openCats} anchorEl={catAnchorEl} placement="bottom-start" sx={{ zIndex: 1300, width: 420 }}>
        <ClickAwayListener onClickAway={handleCloseCats}>
          <Paper elevation={3} sx={{ maxHeight: '70vh', overflowY: 'auto', p: 1 }}>
            {categoriesLoading ? (
              <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={18} /> Завантаження...
              </Box>
            ) : (
              <List dense disablePadding>
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
                          primary={cat.name}
                          secondary={cat.description || undefined}
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