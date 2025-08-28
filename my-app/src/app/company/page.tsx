'use client';

import * as React from 'react';
import Link from 'next/link';
import Header from '@/components/headers/header';
import Footer from '@/components/footers/footer';
import './company.module.css';

// Ключи с товарами в localStorage (подхватываем максимально возможные)
const PRODS_KEYS = [
  'allures_products_v1',
  'products_v1',
  'allures_cart_v1', // иногда продукты лежат в корзине
  'cart_items',
];

export type ProductLike = {
  id?: number | string;
  company_id?: number | string;
  name?: string;
  description?: string;
  price?: number;
  old_price?: number;
  status?: string;
  current_inventory?: number;
  category_id?: number;
  category_name?: string;
  image?: string;
  subcategory?: string;
  product_type?: string;
  is_hit?: boolean;
  is_discount?: boolean;
  is_new?: boolean;
  created_at?: string;
  updated_at?: string;
};

function coerceArray<T = unknown>(val: any): T[] | null {
  if (!val) return null;
  if (Array.isArray(val)) return val as T[];
  if (typeof val === 'object') {
    if (Array.isArray((val as any).items)) return (val as any).items as T[];
    if (Array.isArray((val as any).products)) return (val as any).products as T[];
  }
  return null;
}

function readProductsFromLS(): ProductLike[] {
  if (typeof window === 'undefined') return [];
  const out: ProductLike[] = [];
  for (const key of PRODS_KEYS) {
    const parsed = safeJsonParse<any>(localStorage.getItem(key));
    const arr = coerceArray<ProductLike>(parsed);
    if (arr) out.push(...arr);
  }
  // Дедуп по id
  const seen = new Set<string>();
  return out.filter((p) => {
    const k = p && (p.id != null ? String(p.id) : JSON.stringify(p));
    if (!k) return false;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

// --- Utils for localStorage (safe parsing) ---
function safeJsonParse<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch (_) {
    return null;
  }
}

// Возможные ключи, которые мы уже использовали в проекте
const ORDERS_KEYS = [
  'orders_history_v1', // ← основной ключ по требованию
  'allures_orders_history_v1',
  'orders_history',
  'allures_orders_v1',
  'ALLURES_ORDERS_HISTORY',
];

const PREFERRED_ORDERS_KEY = 'orders_history_v1';

const STATUS_OPTIONS: { value: string; label: string }[] = [
  { value: 'pending', label: 'Очікує' },
  { value: 'approved', label: 'Погоджено' },
  { value: 'packed', label: 'Упаковано' },
  { value: 'shipped', label: 'Відправлено' },
  { value: 'delivered', label: 'Доставлено' },
  { value: 'cancelled', label: 'Скасовано' },
  { value: 'refunded', label: 'Повернення' },
];

function orderKey(o: OrderLike, fallbackIndex?: number): string {
  if (!o) return String(fallbackIndex ?? Math.random());
  if (o.orderId != null) return String(o.orderId);
  if (o.timestamp) return `ts:${o.timestamp}`;
  if (o.createdAt) return `ca:${o.createdAt}`;
  return `idx:${fallbackIndex ?? Math.random()}`;
}

function writeOrdersToLS(list: OrderLike[]) {
  try {
    localStorage.setItem(PREFERRED_ORDERS_KEY, JSON.stringify(list));
    // дублируем в первый найденный старый ключ для совместимости
    for (const k of ORDERS_KEYS) {
      if (k === PREFERRED_ORDERS_KEY) continue;
      if (localStorage.getItem(k) != null) {
        localStorage.setItem(k, JSON.stringify(list));
        break;
      }
    }
  } catch (_) {}
}

// Тип заказа (гибкий, чтобы не падать при лишних полях)
export type OrderLike = {
  orderId?: string | number;
  userId?: string;
  productId?: string | number;
  products?: Array<{ id: string | number; qty?: number; price?: number }>; // если корзина сохраняет массив
  quantity?: number;
  totalPrice?: number;
  amount?: number; // на случай, если поле названо иначе
  companyId?: string | number;
  deliveryAddress?: string;
  status?: string;
  isPaid?: boolean;
  createdAt?: string;
  timestamp?: string;
};

// --- Product API shape (по /product/{id}) ---
export type ProductApi = {
  id: number;
  company_id: number;
  name: string;
  description?: string;
  price: number;
  status?: string;
  current_inventory?: number;
  category_id?: number;
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

async function fetchProductById(id: string | number): Promise<ProductApi | null> {
  try {
    const res = await fetch(`https://api.alluresallol.com/product/${id}`, {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data && typeof data === 'object' && 'id' in data) return data as ProductApi;
    return null;
  } catch (_) {
    return null;
  }
}

function readOrdersFromLS(): OrderLike[] {
  if (typeof window === 'undefined') return [];
  const acc: OrderLike[] = [];
  for (const key of ORDERS_KEYS) {
    const arr = safeJsonParse<OrderLike[]>(localStorage.getItem(key));
    if (Array.isArray(arr)) acc.push(...arr);
  }
  // дедуп по orderId если есть
  const seen = new Set<string>();
  const out = acc.filter((o) => {
    const k = o && (o.orderId != null ? String(o.orderId) : JSON.stringify(o));
    if (!k) return false;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  return out;
}

// Таб с заказами (читает localStorage)
function OrdersTab() {
  const [orders, setOrders] = React.useState<OrderLike[]>([]);

  const [productMap, setProductMap] = React.useState<Record<string, ProductApi>>({});

  // извлекаем (productId, qty) из заказа — поддерживаем оба формата
  const getOrderItems = React.useCallback((o: OrderLike): Array<{ id: string; qty?: number }> => {
    const items: Array<{ id: string; qty?: number }> = [];
    if (o.productId != null) {
      items.push({ id: String(o.productId), qty: typeof o.quantity === 'number' ? o.quantity : undefined });
    } else if (Array.isArray(o.products)) {
      for (const p of o.products) {
        if (!p) continue;
        const pid = (p as any).id;
        if (pid != null) items.push({ id: String(pid), qty: typeof (p as any).qty === 'number' ? (p as any).qty : undefined });
      }
    }
    return items;
  }, []);

  React.useEffect(() => {
    // собрать уникальные id из заказов
    const ids = new Set<string>();
    for (const o of orders) {
      for (const it of getOrderItems(o)) ids.add(it.id);
    }
    // исключить уже имеющиеся
    const toFetch = Array.from(ids).filter((id) => !(id in productMap));
    if (toFetch.length === 0) return;

    let alive = true;
    (async () => {
      const results = await Promise.all(toFetch.map(async (id) => {
        const p = await fetchProductById(id);
        return [id, p] as const;
      }));
      if (!alive) return;
      setProductMap((prev) => {
        const next = { ...prev } as Record<string, ProductApi>;
        for (const [id, p] of results) {
          if (p) next[id] = p;
        }
        return next;
      });
    })();
    return () => { alive = false; };
  }, [orders, getOrderItems, productMap]);

  const formatUAH = (n?: number) =>
    typeof n === 'number' ? `${n.toLocaleString('uk-UA')} ₴` : '—';

  const updateStatus = React.useCallback((key: string, status: string) => {
    setOrders((prev) => {
      const next = prev.map((o, i) => (orderKey(o, i) === key ? { ...o, status } : o));
      if (typeof window !== 'undefined') writeOrdersToLS(next);
      return next;
    });
  }, []);

  const togglePaid = React.useCallback((key: string, paid: boolean) => {
    setOrders((prev) => {
      const next = prev.map((o, i) => (orderKey(o, i) === key ? { ...o, isPaid: paid } : o));
      if (typeof window !== 'undefined') writeOrdersToLS(next);
      return next;
    });
  }, []);

  React.useEffect(() => {
    setOrders(readOrdersFromLS());
    const onStorage = (e: StorageEvent) => {
      if (!e.key || !ORDERS_KEYS.includes(e.key)) return;
      setOrders(readOrdersFromLS());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <section className="company-orders" aria-labelledby="orders-title">
      <div className="company-step__head">
        <span className="company-step__index" aria-hidden>3</span>
        <h2 id="orders-title" className="company-step__title">Замовлення</h2>
      </div>

      {orders.length === 0 ? (
        <div className="orders-empty">Тут будуть ваші замовлення</div>
      ) : (
        <div className="orders-card">
          <table className="ordersTable">
            <thead>
              <tr>
                <th>#</th>
                <th>ID замовлення</th>
                <th>Користувач</th>
                <th>Продукт</th>
                <th>Сума</th>
                <th>Статус</th>
                <th>Оплата</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, idx) => {
                const sum = (typeof o.totalPrice === 'number'
                  ? o.totalPrice
                  : (typeof o.amount === 'number' ? o.amount : undefined));
                const k = orderKey(o, idx);
                return (
                  <tr key={k}>
                    <td>{idx + 1}</td>
                    <td className="mono">{o.orderId ?? '—'}</td>
                    <td>{o.userId ?? '—'}</td>
                    <td>
                      {(() => {
                        const items = getOrderItems(o);
                        if (items.length === 0) return <span>—</span>;
                        return (
                          <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
                            {items.map((it, i) => {
                              const p = productMap[it.id];
                              const title = p?.name || `Товар #${it.id}`;
                              const price = p?.price;
                              const qty = typeof it.qty === 'number' ? it.qty : undefined;
                              const img = p?.image;
                              return (
                                <li key={`${it.id}:${i}`} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                  {img ? (
                                    <img src={img} alt={title} width={36} height={36} style={{ objectFit: 'cover', borderRadius: 6, border: '1px solid #eee' }} />
                                  ) : (
                                    <div style={{ width: 36, height: 36, borderRadius: 6, background: '#f3f4f6', display: 'inline-block' }} />
                                  )}
                                  <div style={{ display: 'grid' }}>
                                    <span style={{ fontWeight: 600, lineHeight: 1.15 }}>{title}</span>
                                    <span style={{ color: '#6b7280', fontSize: 12 }}>
                                      {qty != null ? `${qty} × ` : ''}{typeof price === 'number' ? `${price.toLocaleString('uk-UA')} ₴` : '—'}
                                    </span>
                                  </div>
                                </li>
                              );
                            })}
                          </ul>
                        );
                      })()}
                    </td>
                    <td className="mono">{formatUAH(sum)}</td>
                    <td>
                      <select
                        className="orders-status"
                        value={o.status ?? 'pending'}
                        onChange={(e) => updateStatus(k, e.target.value)}
                      >
                        {STATUS_OPTIONS.map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <label className="orders-paid">
                        <input
                          type="checkbox"
                          checked={o.isPaid === true}
                          onChange={(e) => togglePaid(k, e.target.checked)}
                        />
                        <span>Оплачено</span>
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

// Таб с товарами (читает localStorage)
function ProductsTab() {
  const [products, setProducts] = React.useState<ProductLike[]>([]);

  const formatUAH = (n?: number) =>
    typeof n === 'number' ? `${n.toLocaleString('uk-UA')} ₴` : '—';

  React.useEffect(() => {
    setProducts(readProductsFromLS());
    const onStorage = (e: StorageEvent) => {
      if (!e.key || !PRODS_KEYS.includes(e.key)) return;
      setProducts(readProductsFromLS());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return (
    <section className="company-products" aria-labelledby="products-title">
      <div className="company-step__head">
        <span className="company-step__index" aria-hidden>—</span>
        <h2 id="products-title" className="company-step__title">Товари</h2>
      </div>

      {products.length === 0 ? (
        <div className="orders-empty">Тут будуть ваші товари</div>
      ) : (
        <div className="orders-card">
          <table className="ordersTable">
            <thead>
              <tr>
                <th>#</th>
                <th>Фото</th>
                <th>Назва</th>
                <th>Категорія</th>
                <th>Тип</th>
                <th>Ціна</th>
                <th>Стара ціна</th>
                <th>Статус</th>
                <th>Наявність</th>
                <th>Оновлено</th>
              </tr>
            </thead>
            <tbody>
              {products.map((p, idx) => (
                <tr key={(p.id ?? idx) as React.Key}>
                  <td>{idx + 1}</td>
                  <td>
                    {p.image ? (
                      <img src={p.image} alt={p.name || 'product'} style={{ width: 56, height: 56, objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600 }}>{p.name ?? '—'}</div>
                    {p.description ? (
                      <div style={{ color: '#6b7280', maxWidth: 420, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.description}</div>
                    ) : null}
                  </td>
                  <td>{p.category_name ?? (p.category_id != null ? `#${p.category_id}` : '—')}</td>
                  <td>{p.product_type ?? p.subcategory ?? '—'}</td>
                  <td className="mono">{formatUAH(p.price)}</td>
                  <td className="mono">{formatUAH(p.old_price)}</td>
                  <td>{p.status ?? (p.is_new ? 'new' : '—')}</td>
                  <td>{p.current_inventory != null ? p.current_inventory : '—'}</td>
                  <td className="mono">{p.updated_at ? new Date(p.updated_at).toLocaleDateString('uk-UA') : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function CompanyPage() {
  const [active, setActive] = React.useState<'home' | 'products' | 'orders' | 'balance' | 'promotion' | 'shop' | 'settings' | 'clients'>('home');

  const plans = [
    {
      id: 'basic',
      ribbon: 'Зекономте 20% для нових замовлень',
      title: 'Allures Business',
      price: 6999,
      features: [
        'До 1 000 товарів',
        'Карти товарів',
        'Оформлення замовлень',
        'Доступ до SEO-опцій',
      ],
      popular: false,
    },
    {
      id: 'pro',
      ribbon: 'Зекономте 20% для нових замовлень',
      title: 'Allures Business+',
      price: 10499,
      features: [
        'До 5 000 товарів',
        'Розширені інструменти',
        'Пріоритетна підтримка',
        'Повний доступ до SEO-опцій',
      ],
      popular: true,
    },
    {
      id: 'max',
      ribbon: 'Зекономте 20% для нових замовлень',
      title: 'Allures Business pro',
      price: 12899,
      features: [
        'Необмежено товарів',
        'Інтеграції та API',
        'Командні доступи',
        'CEO/SEO-опції без обмежень',
      ],
      popular: false,
    },
  ];

  return (
    <>
      <Header />

      <main className="company">
        <div className="company__bar">
          <nav className="company__breadcrumbs" aria-label="breadcrumbs">
            <Link href="/">На головну</Link>
            <span aria-hidden> / </span>
            <span>Allures Business</span>
          </nav>
        </div>

        <div className="company__layout">
          {/* Ліва навігація */}
          <aside className="company__sidebar" aria-label="Навігація бізнес-кабінету">
            <ul className="company-nav">
              <li className={`company-nav__item ${active === 'home' ? 'company-nav__item--active' : ''}`}>
                <a href="#" className="company-nav__link" aria-current={active === 'home' ? 'page' : undefined}
                   onClick={(e) => { e.preventDefault(); setActive('home'); }}>
                  Головна
                </a>
              </li>
              <li className={`company-nav__item ${active === 'products' ? 'company-nav__item--active' : ''}`}>
                <a href="#" className="company-nav__link" aria-current={active === 'products' ? 'page' : undefined}
                   onClick={(e) => { e.preventDefault(); setActive('products'); }}>
                  Товари
                </a>
              </li>
              <li className={`company-nav__item ${active === 'orders' ? 'company-nav__item--active' : ''}`}>
                <a href="#" className="company-nav__link" aria-current={active === 'orders' ? 'page' : undefined}
                   onClick={(e) => { e.preventDefault(); setActive('orders'); }}>
                  Замовлення
                </a>
              </li>
              
              
              <li className={`company-nav__item ${active === 'shop' ? 'company-nav__item--active' : ''}`}>
                <a href="#" className="company-nav__link" aria-current={active === 'shop' ? 'page' : undefined}
                   onClick={(e) => { e.preventDefault(); setActive('shop'); }}>
                  Мій магазин
                </a>
              </li>
              <li className={`company-nav__item ${active === 'settings' ? 'company-nav__item--active' : ''}`}>
                <a href="#" className="company-nav__link" aria-current={active === 'settings' ? 'page' : undefined}
                   onClick={(e) => { e.preventDefault(); setActive('settings'); }}>
                  Налаштування
                </a>
              </li>
              
            </ul>
          </aside>

          {/* Основний вміст */}
          <section className="company__content">
            {active === 'home' && (
              <>
                <header className="company__hero">
                  <h1 className="company__title">Раді вітати в Allures Business!</h1>
                  <ol className="company__intro">
                    <li>Придбайте річне розміщення, щоб почати роботу</li>
                    <li>Додайте товари, та побачить мільйони покупців на Allures</li>
                    <li>Продавайте на Allures та сплачуйте комісію лише за успішні замовлення</li>
                  </ol>
                </header>

                {/* Крок 1 */}
                <section className="company-step" aria-labelledby="step1-title">
                  <div className="company-step__head">
                    <span className="company-step__index" aria-hidden>1</span>
                    <h2 id="step1-title" className="company-step__title">Річне розміщення</h2>
                  </div>

                  <div className="plans">
                    {plans.map((p) => (
                      <article key={p.id} className={`plan${p.popular ? ' plan--popular' : ''}`} aria-label={p.title}>
                        <div className="plan__ribbon">{p.ribbon}</div>
                        <header className="plan__header">
                          <h3 className="plan__title">{p.title}</h3>
                        </header>
                        <ul className="plan__features">
                          {p.features.map((f, i) => (
                            <li key={i}>{f}</li>
                          ))}
                        </ul>
                        <div className="plan__price">
                          <span className="plan__amount">{p.price.toLocaleString('uk-UA')}</span>
                          <span className="plan__currency">₴</span>
                        </div>
                        <div className="plan__actions">
                          <button type="button" className="plan__buy" data-plan-id={p.id}>
                            Придбати
                          </button>
                        </div>
                      </article>
                    ))}
                  </div>
                </section>

                {/* Крок 2 */}
                <section className="company-step" aria-labelledby="step2-title">
                  <div className="company-step__head">
                    <span className="company-step__index" aria-hidden>2</span>
                    <h2 id="step2-title" className="company-step__title">Додайте товари</h2>
                  </div>

                  <p className="company-step__desc">
                    Після придбання тарифу ваші товари автоматично публікуються у каталозі
                    Allures, якщо відповідають вимогам.
                  </p>

                  <div className="company-step__actions">
                    <Link href="/admpanel/products/new" className="btn btn--primary">Додати</Link>
                  </div>
                </section>
              </>
            )}

            {active === 'orders' && <OrdersTab />}

            {active === 'products' && <ProductsTab />}

            {active === 'shop' && (
              <section className="company-step">
                <div className="company-step__head">
                  <span className="company-step__index" aria-hidden>—</span>
                  <h2 className="company-step__title">Мій магазин</h2>
                </div>
                <p>Налаштування магазину буде додано пізніше.</p>
              </section>
            )}

            
            {active === 'settings' && (
              <section className="company-step"><div className="company-step__head"><span className="company-step__index" aria-hidden>—</span><h2 className="company-step__title">Налаштування</h2></div><p>Налаштування акаунту/магазину.</p></section>
            )}
            
          </section>
        </div>
      </main>

      <Footer />
    </>
  );
}