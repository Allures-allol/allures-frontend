

"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Header/Footer from components (fallback to no-op if missing)
const Header: any = dynamic(() => import('../../components/headers/header').catch(() => () => null), { ssr: false });
const Footer: any = dynamic(() => import('../../components/footers/footer').catch(() => () => null), { ssr: false });

// LocalStorage key used across the app
const WISHLIST_KEY = 'allures_wishlist_v1';

// Read wishlist from localStorage and normalize
const readWishlist = (): any[] => {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(WISHLIST_KEY);
    const v = raw ? JSON.parse(raw) : [];
    if (Array.isArray(v)) return v;
    if (v && Array.isArray(v.items)) return v.items;
    if (v && typeof v === 'object') return Object.values(v as any).filter(Boolean);
  } catch {}
  return [];
};

export default function WishlistPage() {
  const [items, setItems] = React.useState<any[]>([]);

  const sync = React.useCallback(() => {
    setItems(readWishlist());
  }, []);

  React.useEffect(() => {
    sync();
    const onStorage = (e: StorageEvent) => {
      if (!e || e.key === null || e.key === WISHLIST_KEY) sync();
    };
    const onCustom = () => sync();
    window.addEventListener('storage', onStorage);
    window.addEventListener('wishlist:changed', onCustom as any);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('wishlist:changed', onCustom as any);
    };
  }, [sync]);

  const removeFromWishlist = (pid: number | string) => {
    try {
      const arr = readWishlist();
      const idx = arr.findIndex((x: any) => String(x?.id) === String(pid));
      if (idx >= 0) {
        arr.splice(idx, 1);
        window.localStorage.setItem(WISHLIST_KEY, JSON.stringify(arr));
        window.dispatchEvent(new Event('wishlist:changed'));
        setItems(arr);
      }
    } catch {}
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Header />

      {/* <div style={{ background: '#155EEF', color: '#fff', padding: '10px 16px', fontWeight: 600 }}>
        Каталог товарів
      </div> */}

      <main style={{ flex: 1, display: 'flex', gap: 24, padding: 16, maxWidth: 1280, width: '100%', margin: '0 auto' }}>
        {/* Sidebar */}
        <aside style={{ width: 260 }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 12 }}>
            {/* <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#efefef', display: 'grid', placeItems: 'center', fontSize: 22 }}>👤</div> */}
            <div>
              {/* <div style={{ fontWeight: 700 }}>Ім'я Прізвище</div>
              <div style={{ fontSize: 12, color: '#6b7280' }}>name123@gmail.com</div> */}
            </div>
          </div>
          <nav>
            {/* <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 6 }}>
              <li><Link href="/profile" style={{ textDecoration: 'none', color: '#111827' }}>Контактна інформація</Link></li>
              <li><Link href="/profile" style={{ textDecoration: 'none', color: '#111827' }}>Історія замовлень</Link></li>
              <li style={{ fontWeight: 700 }}>Список бажань</li>
              <li><Link href="/profile" style={{ textDecoration: 'none', color: '#111827' }}>Кошик</Link></li>
              <li><Link href="/discounts" style={{ textDecoration: 'none', color: '#111827' }}>Знижки та акції</Link></li>
              <li><Link href="/viewed" style={{ textDecoration: 'none', color: '#111827' }}>Переглянуті товари</Link></li>
              <li><Link href="/seller" style={{ textDecoration: 'none', color: '#111827' }}>Кабінет продавця</Link></li>
            </ul> */}
          </nav>
        </aside>

        {/* Content */}
        <section style={{ flex: 1 }}>
          <h2 style={{ margin: '8px 0 16px 0' }}>Список бажань</h2>

          {(!items || items.length === 0) && (
            <div style={{ border: '1px solid #E5E7EB', borderRadius: 8, padding: 16 }}>
              <p style={{ color: '#6b7280', margin: 0 }}>ви ще не додали товар у бажане</p>
            </div>
          )}

          {items && items.length > 0 && (
            <div style={{ display: 'grid', gap: 0 }}>
              {items.map((it: any, idx: number) => {
                const pid = it?.id ?? it?.productId ?? null;
                const name = it?.name ?? it?.title ?? `Товар ${idx + 1}`;
                const price = Number(it?.price ?? it?.unitPrice ?? 0) || 0;
                const old = it?.old_price != null ? Number(it.old_price) : null;
                const img = it?.image ?? null;
                return (
                  <div key={`w-${pid ?? idx}`} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '14px 8px', borderBottom: '1px solid #eee' }}>
                    {img ? (
                      <Image src={img} alt={name} width={64} height={64} style={{ objectFit: 'cover', borderRadius: 8 }} />
                    ) : (
                      <div style={{ width: 64, height: 64, borderRadius: 8, background: '#f3f4f6' }} />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                      <div style={{ color: '#6b7280', fontSize: 14 }}>
                        {old != null ? (
                          <>
                            <span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{old.toFixed(2)} ₴</span>{' '}
                          </>
                        ) : null}
                        <span>{price.toFixed(2)} ₴</span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {pid ? (
                        <Link href={`/products/${encodeURIComponent(String(pid))}`} style={{ textDecoration: 'none', fontWeight: 600 }}>
                          Перейти до товару →
                        </Link>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => pid && removeFromWishlist(pid)}
                        style={{ border: '1px solid #e5e7eb', background: '#fff', padding: '6px 10px', borderRadius: 6, cursor: 'pointer' }}
                        aria-label="Видалити з бажаного"
                        title="Видалити"
                      >
                        Видалити
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </div>
  );
}