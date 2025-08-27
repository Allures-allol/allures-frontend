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
  Tooltip,
} from '@mui/material';
import Image from 'next/image';

// ===== Types =====
export type Role = 'admin' | 'manager' | 'customer' | 'guest' | 'user' | (string & {});

export type UserRow = {
  id: string | number;
  login?: string;
  full_name?: string;
  name: string; // fallback/display name
  email: string;
  phone?: string;
  avatar_url?: string;
  language?: string;
  bonus_balance?: number;
  delivery_address?: string;
  registered_at?: string;
  role: Role;
  is_blocked?: boolean;
  created_at?: string; // backward compatibility
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
  name: string;
  price: number;
  old_price?: number;
  image?: string;
  category_name?: string;
  is_discount?: boolean;
  description?: string;
  category_id?: number | string;
};

export type ReviewRow = {
  id: string | number;
  product: string;
  user: string;
  rating: number; // 1-5
  comment?: string;
  created_at?: string;
};

export type CategoryOption = { id: number | string; name: string };

// ===== Helpers =====
const fmtUA = (n: unknown) => {
  const num = typeof n === 'string' ? Number(n) : (n as number);
  return Number.isFinite(num) ? (num as number).toLocaleString('uk-UA') : '—';
};

const imgSrc = (src?: string | null) => {
  if (!src) return '/placeholder.png';
  if (src.startsWith('http')) return src;
  return `https://api.alluresallol.com${src.startsWith('/') ? '' : '/'}${src}`;
};

// compare IDs (числовая/строковая)
const cmpId = (a: string | number, b: string | number) => {
  const na = Number(a);
  const nb = Number(b);
  const aNum = Number.isFinite(na);
  const bNum = Number.isFinite(nb);
  if (aNum && bNum) return na - nb;
  return String(a).localeCompare(String(b), 'uk');
};

// ===== Fake data fallbacks (если нет собственного бэка) =====
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

// ===== API calls =====
const ADMIN_BASE = process.env.NEXT_PUBLIC_ADMIN_API_BASE || '';

async function fetchUsers(role?: Role): Promise<UserRow[]> {
  try {
    const base = 'https://api.alluresallol.com/auth/users';
    const limit = 100; // разумная страница
    let offset = 0;
    const out: UserRow[] = [];
    let total: number | null = null;

    for (let page = 0; page < 200; page += 1) {
      const url = `${base}?limit=${limit}&offset=${offset}`;
      const res = await fetch(url, {
        cache: 'no-store',
        headers: { accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Users ${res.status}`);
      const json = await res.json();

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

      const batch: UserRow[] = items.map((u: any, idx: number) => {
        const fullName =
          u.full_name ||
          [u.first_name, u.last_name].filter(Boolean).join(' ').trim();
        const displayName = u.name || fullName || u.username || u.login || u.email || `Користувач ${offset + idx + 1}`;

        const roleRaw = String(u.role ?? u.user_role ?? '').toLowerCase();
        const mappedRole: Role = (roleRaw as Role) || 'user';

        return {
          id: u.id ?? u.user_id ?? (offset + idx),
          login: u.login ?? u.username ?? '',
          full_name: fullName || undefined,
          name: String(displayName),
          email: String(u.email || '—'),
          phone: u.phone ?? u.phone_number ?? '',
          avatar_url: u.avatar_url ?? u.avatar ?? '',
          language: u.language ?? u.lang ?? 'uk',
          bonus_balance: typeof u.bonus_balance === 'number' ? u.bonus_balance : Number(u.bonus_balance ?? 0) || 0,
          delivery_address: u.delivery_address ?? u.address ?? '',
          registered_at: u.registered_at || u.date_joined || u.created_at || u.createdAt || undefined,
          role: mappedRole,
          is_blocked: Boolean(u.is_blocked ?? u.blocked ?? false),
          created_at: u.created_at || u.createdAt || undefined,
        } as UserRow;
      });

      out.push(...batch);

      // условия выхода
      if (typeof total === 'number' && out.length >= total) break;
      if (items.length < limit) break;
      offset += limit;
    }

    // фильтрация по роли, если задана
    return role ? out.filter((r) => r.role === role) : out;
  } catch (e) {
    console.warn('Users API error, fallback to demo:', e);
    return demoUsers.filter((u) => !role || u.role === role);
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
    const base = 'https://api.alluresallol.com/product/products/';
    const limit = 100; // максимум по твоей схеме API
    let offset = 0;
    const out: ProductRow[] = [];

    for (let page = 0; page < 200; page += 1) {
      const url = `${base}?offset=${offset}&limit=${limit}&sort=-id`;
      const res = await fetch(url, {
        cache: 'no-store',
        headers: { accept: 'application/json' },
      });
      if (!res.ok) throw new Error(`Products ${res.status}`);

      const json = await res.json();
      const items: any[] = Array.isArray(json?.items)
        ? json.items
        : Array.isArray(json)
        ? json
        : (json?.results ?? []);

      const batch: ProductRow[] = items.map((p: any, i: number) => ({
        id: p.id ?? (offset + i),
        name: String(p.name ?? ''),
        price: Number(p.price ?? 0),
        old_price: Number(p.old_price ?? 0),
        image: typeof p.image === 'string' ? p.image : '',
        category_name: p.category_name ?? '',
        is_discount: Boolean(p.is_discount),
        description: typeof p.description === 'string' ? p.description : undefined,
        category_id: p.category_id ?? undefined,
      }));

      out.push(...batch);

      if (items.length < limit) break; // последняя страница
      offset += limit;
    }

    return out;
  } catch (e) {
    console.warn('Products error:', e);
    return [];
  }
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
    // de-dup by id & sort by name
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
  try {
    const res = await fetch(`https://api.alluresallol.com/product/products/${id}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const p = await res.json();
    return {
      id: p.id,
      name: String(p.name ?? ''),
      price: Number(p.price ?? 0),
      old_price: Number(p.old_price ?? 0),
      image: typeof p.image === 'string' ? p.image : '',
      category_name: p.category_name ?? '',
      is_discount: Boolean(p.is_discount),
      description: String(p.description ?? ''),
      category_id: p.category_id ?? undefined,
    } as ProductRow;
  } catch (e) {
    console.warn('loadProductById error', e);
    return null;
  }
}

async function updateProduct(id: number | string, payload: Partial<ProductRow>): Promise<ProductRow> {
  const base = 'https://api.alluresallol.com/product/products/';
  const body: any = {
    name: payload.name,
    price: payload.price,
    old_price: payload.old_price,
    image: payload.image,
    is_discount: payload.is_discount,
    description: payload.description,
    category_id: payload.category_id,
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
      if (!res.ok) {
        lastErr = new Error(`${a.method} ${res.status}`);
        continue;
      }
      const p = await res.json();
      return {
        id: p.id,
        name: String(p.name ?? body.name ?? ''),
        price: Number(p.price ?? body.price ?? 0),
        old_price: Number(p.old_price ?? body.old_price ?? 0),
        image: typeof p.image === 'string' ? p.image : body.image || '',
        category_name: p.category_name ?? '',
        is_discount: Boolean(p.is_discount ?? body.is_discount),
        description: String(p.description ?? body.description ?? ''),
        category_id: p.category_id ?? body.category_id,
      } as ProductRow;
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error('Update failed');
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

// ===== Tabs wrapper =====
function TabPanel(props: { children?: React.ReactNode; value: number; index: number }) {
  const { children, value, index } = props;
  return <div role="tabpanel" hidden={value !== index}>{value === index && <Box sx={{ pt: 2 }}>{children}</Box>}</div>;
}

// ===== Main Page =====
export default function AdminPanelPage() {
  const [tab, setTab] = React.useState(0);

  // Users state
  const [roleFilter, setRoleFilter] = React.useState<Role | 'all'>('all');
  const [users, setUsers] = React.useState<UserRow[]>([]);
  const [usersLoading, setUsersLoading] = React.useState(false);
  const [usersErr, setUsersErr] = React.useState<string | null>(null);

  // Payments state
  const [payments, setPayments] = React.useState<PaymentRow[]>([]);
  const [paymentsLoading, setPaymentsLoading] = React.useState(false);
  const [paymentsErr, setPaymentsErr] = React.useState<string | null>(null);

  // Products state
  const [products, setProducts] = React.useState<ProductRow[]>([]);
  const [productsLoading, setProductsLoading] = React.useState(false);

  // Reviews state
  const [reviews, setReviews] = React.useState<ReviewRow[]>([]);
  const [reviewsLoading, setReviewsLoading] = React.useState(false);

  // Categories for editor
  const [categories, setCategories] = React.useState<CategoryOption[]>([]);
  const [categoriesLoading, setCategoriesLoading] = React.useState(false);

  // Sort orders per tab
  const [usersOrder, setUsersOrder] = React.useState<'asc' | 'desc'>('desc');
  const [paymentsOrder, setPaymentsOrder] = React.useState<'asc' | 'desc'>('desc');
  const [productsOrder, setProductsOrder] = React.useState<'asc' | 'desc'>('desc');
  const [reviewsOrder, setReviewsOrder] = React.useState<'asc' | 'desc'>('desc');

  // Sorted views
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
    users.forEach((u) => {
      if (u.role) set.add(String(u.role));
    });
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

  const reviewsView = React.useMemo(() => {
    const arr = Array.isArray(reviews) ? reviews.slice() : [];
    return arr.sort((a, b) => (reviewsOrder === 'asc' ? cmpId(a.id, b.id) : cmpId(b.id, a.id)));
  }, [reviews, reviewsOrder]);

  // Edit dialog state
  const [editOpen, setEditOpen] = React.useState(false);
  const [editLoading, setEditLoading] = React.useState(false);
  const [editError, setEditError] = React.useState<string | null>(null);
  const [editProductId, setEditProductId] = React.useState<number | string | null>(null);
  const [editForm, setEditForm] = React.useState<Partial<ProductRow>>({
    name: '',
    price: 0,
    old_price: 0,
    image: '',
    is_discount: false,
    description: '',
  });

  const openEdit = async (id: number | string) => {
    setEditProductId(id);
    setEditError(null);
    setEditOpen(true);
    const p = await loadProductById(id);
    if (p)
      setEditForm({
        name: p.name,
        price: p.price,
        old_price: p.old_price,
        image: p.image,
        is_discount: p.is_discount,
        description: p.description,
        category_id: p.category_id,
      });
  };

  const handleEditChange = (field: keyof ProductRow, value: any) => {
    setEditForm((prev) => ({ ...prev, [field]: value }));
  };

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
    } finally {
      setEditLoading(false);
    }
  };

  // Fetch on tab change / filter change
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
        // лениво загружаем категории
        if (categories.length === 0 && !categoriesLoading) {
          setCategoriesLoading(true);
          fetchCategoriesAll()
            .then((cats) => {
              if (alive) setCategories(cats);
            })
            .finally(() => {
              if (alive) setCategoriesLoading(false);
            });
        }
      }
      if (tab === 3) {
        try {
          setReviewsLoading(true);
          const data = await fetchReviews();
          if (alive) setReviews(data);
        } finally {
          if (alive) setReviewsLoading(false);
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [tab, roleFilter, categories.length, categoriesLoading]);

  return (
    <Box sx={{ maxWidth: 1280, mx: 'auto', px: 2, py: 3 }}>
      <Typography variant="h5" fontWeight={700} gutterBottom>
        Адмін-панель
      </Typography>

      <Paper variant="outlined" sx={{ borderRadius: 2 }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Користувачі" />
          <Tab label="Платежі" />
          <Tab label="Товари" />
          <Tab label="Відгуки" />
        </Tabs>

        <Box sx={{ p: 2 }}>
          {/* Users */}
          <TabPanel value={tab} index={0}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <FormControl sx={{ minWidth: 200 }} size="small">
                <InputLabel id="role-filter">Роль</InputLabel>
                <Select
                  labelId="role-filter"
                  label="Роль"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as any)}
                >
                  <MenuItem value="all">Всі</MenuItem>
                  {usersRoles.map((r) => (
                    <MenuItem key={r} value={r}>
                      {r}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <TextField size="small" label="Пошук (ім'я/емейл)" placeholder="Введіть…" disabled />
              <FormControl sx={{ minWidth: 180 }} size="small">
                <InputLabel id="users-sort-id">Сортування ID</InputLabel>
                <Select
                  labelId="users-sort-id"
                  label="Сортування ID"
                  value={usersOrder}
                  onChange={(e) => setUsersOrder(e.target.value as 'asc' | 'desc')}
                >
                  <MenuItem value="desc">За спаданням (9 → 1)</MenuItem>
                  <MenuItem value="asc">За зростанням (1 → 9)</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            {usersLoading ? (
              <Stack alignItems="center" py={4}>
                <CircularProgress />
              </Stack>
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {usersView.map((u) => (
                      <TableRow key={u.id} hover>
                        <TableCell>
                          <Box sx={{ width: 36, height: 36, borderRadius: '50%', overflow: 'hidden', bgcolor: '#f3f4f6' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={u.avatar_url || '/avatar-placeholder.png'}
                              alt={u.full_name || u.name || String(u.id)}
                              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>{u.id}</TableCell>
                        <TableCell>{u.login || '—'}</TableCell>
                        <TableCell>{u.full_name || u.name || '—'}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell>{u.phone || '—'}</TableCell>
                        <TableCell>
                          {u.language ? <Chip label={String(u.language).toUpperCase()} size="small" /> : '—'}
                        </TableCell>
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
                          <Chip
                            label={u.is_blocked ? 'Заблокований' : 'Активний'}
                            size="small"
                            color={u.is_blocked ? 'error' : 'success'}
                          />
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
                <Select
                  labelId="payments-sort-id"
                  label="Сортування ID"
                  value={paymentsOrder}
                  onChange={(e) => setPaymentsOrder(e.target.value as 'asc' | 'desc')}
                >
                  <MenuItem value="desc">За спаданням (9 → 1)</MenuItem>
                  <MenuItem value="asc">За зростанням (1 → 9)</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            {paymentsLoading ? (
              <Stack alignItems="center" py={4}>
                <CircularProgress />
              </Stack>
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
                        <TableCell>
                          {fmtUA(p.amount)} {p.currency || 'UAH'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={p.status}
                            size="small"
                            color={p.status === 'paid' ? 'success' : p.status === 'pending' ? 'warning' : 'error'}
                          />
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
                <Select
                  labelId="products-sort-id"
                  label="Сортування ID"
                  value={productsOrder}
                  onChange={(e) => setProductsOrder(e.target.value as 'asc' | 'desc')}
                >
                  <MenuItem value="desc">За спаданням (9 → 1)</MenuItem>
                  <MenuItem value="asc">За зростанням (1 → 9)</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            {productsLoading ? (
              <Stack alignItems="center" py={4}>
                <CircularProgress />
              </Stack>
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
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {productsView.map((p) => (
                      <TableRow key={p.id} hover onClick={() => openEdit(p.id)} sx={{ cursor: 'pointer' }}>
                        <TableCell>{p.id}</TableCell>
                        <TableCell>
                          <Box sx={{ width: 64, height: 48, position: 'relative' }}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={imgSrc(p.image)}
                              alt={p.name}
                              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>{p.name}</TableCell>
                        <TableCell>{p.category_name || '—'}</TableCell>
                        <TableCell align="right">
                          {p.is_discount && p.old_price && p.old_price > 0 && (
                            <Typography
                              component="span"
                              sx={{ textDecoration: 'line-through', color: 'text.secondary', mr: 1 }}
                            >
                              {fmtUA(p.old_price)} ₴
                            </Typography>
                          )}
                          <Typography component="span" fontWeight={700}>
                            {fmtUA(p.price)} ₴
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Reviews */}
          <TabPanel value={tab} index={3}>
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} mb={2}>
              <FormControl sx={{ minWidth: 220 }} size="small">
                <InputLabel id="reviews-sort-id">Сортування ID</InputLabel>
                <Select
                  labelId="reviews-sort-id"
                  label="Сортування ID"
                  value={reviewsOrder}
                  onChange={(e) => setReviewsOrder(e.target.value as 'asc' | 'desc')}
                >
                  <MenuItem value="desc">За спаданням (9 → 1)</MenuItem>
                  <MenuItem value="asc">За зростанням (1 → 9)</MenuItem>
                </Select>
              </FormControl>
            </Stack>
            {reviewsLoading ? (
              <Stack alignItems="center" py={4}>
                <CircularProgress />
              </Stack>
            ) : (
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>ID</TableCell>
                      <TableCell>Товар</TableCell>
                      <TableCell>Користувач</TableCell>
                      <TableCell>Оцінка</TableCell>
                      <TableCell>Коментар</TableCell>
                      <TableCell>Створено</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {reviewsView.map((r) => (
                      <TableRow key={r.id} hover>
                        <TableCell>{r.id}</TableCell>
                        <TableCell>{r.product}</TableCell>
                        <TableCell>{r.user}</TableCell>
                        <TableCell>
                          <Stack direction="row" spacing={0.5}>
                            {Array.from({ length: 5 }).map((_, i) => (
                              <span key={i}>{i < r.rating ? '★' : '☆'}</span>
                            ))}
                          </Stack>
                        </TableCell>
                        <TableCell>{r.comment || '—'}</TableCell>
                        <TableCell>{r.created_at ? new Date(r.created_at).toLocaleString('uk-UA') : '—'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </TabPanel>

          {/* Edit Product Dialog */}
          <Dialog open={editOpen} onClose={() => setEditOpen(false)} fullWidth maxWidth="sm">
            <DialogTitle>Редагувати товар #{String(editProductId || '')}</DialogTitle>
            <DialogContent dividers>
              <Stack spacing={2} mt={1}>
                {editError && <Alert severity="error">{editError}</Alert>}
                <TextField
                  label="Назва"
                  value={editForm.name ?? ''}
                  onChange={(e) => handleEditChange('name', e.target.value)}
                  fullWidth
                />

                <FormControl fullWidth size="small">
                  <InputLabel id="edit-category">Категорія</InputLabel>
                  <Select
                    labelId="edit-category"
                    label="Категорія"
                    value={editForm.category_id ?? ''}
                    onChange={(e) => handleEditChange('category_id', e.target.value)}
                  >
                    <MenuItem value="">—</MenuItem>
                    {categories.map((c) => (
                      <MenuItem key={String(c.id)} value={c.id}>
                        {c.name}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>

                <TextField
                  label="Опис"
                  value={editForm.description ?? ''}
                  onChange={(e) => handleEditChange('description', e.target.value)}
                  fullWidth
                  multiline
                  minRows={3}
                />
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Ціна"
                    type="number"
                    value={editForm.price ?? 0}
                    onChange={(e) => handleEditChange('price', Number(e.target.value))}
                    fullWidth
                  />
                  <TextField
                    label="Стара ціна"
                    type="number"
                    value={editForm.old_price ?? 0}
                    onChange={(e) => handleEditChange('old_price', Number(e.target.value))}
                    fullWidth
                  />
                </Stack>
                <TextField
                  label="Зображення (URL)"
                  value={editForm.image ?? ''}
                  onChange={(e) => handleEditChange('image', e.target.value)}
                  fullWidth
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={Boolean(editForm.is_discount)}
                      onChange={(e) => handleEditChange('is_discount', e.target.checked)}
                    />
                  }
                  label="Акційний товар"
                />
              </Stack>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setEditOpen(false)} disabled={editLoading}>
                Скасувати
              </Button>
              <Button onClick={saveEdit} variant="contained" disabled={editLoading}>
                {editLoading ? 'Збереження…' : 'Зберегти'}
              </Button>
            </DialogActions>
          </Dialog>
        </Box>
      </Paper>

      {/* Пример: кнопка оновити активну вкладку */}
      <Stack direction="row" justifyContent="flex-end" mt={2}>
        <Button
          variant="outlined"
          onClick={() => {
            // триггерим эффект повторно
            setTab((t) => t);
          }}
        >
          Оновити
        </Button>
      </Stack>
    </Box>
  );
}