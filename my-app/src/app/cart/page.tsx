'use client';

import React from 'react';
import Link from 'next/link';
import Header from '@/components/headers/header';
import Footer from '@/components/footers/footer';

// Хранилище корзины
const CART_KEY = 'allures_cart_v1';

export type CartItem = {
  id: number;
  name: string;
  price: number; // актуальная цена
  old_price?: number | null;
  image?: string | null;
  qty: number; // количество в корзине
  // Доп. инфа (необязательно)
  category_name?: string | null;
};

function readCart(): CartItem[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(arr)) return [];
    // Валидация и нормализация
    return arr
      .map((x) => ({
        id: Number(x?.id),
        name: String(x?.name ?? ''),
        price: Number(x?.price ?? 0),
        old_price: typeof x?.old_price === 'number' ? x.old_price : null,
        image: x?.image ? String(x.image) : null,
        qty: Math.max(1, Number(x?.qty ?? 1)),
        category_name: x?.category_name ? String(x.category_name) : null,
      }))
      .filter((x) => Number.isFinite(x.id) && x.name);
  } catch {
    return [];
  }
}

function saveCart(items: CartItem[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(CART_KEY, JSON.stringify(items));
}

function formatPrice(n: number) {
  try {
    return n.toLocaleString('uk-UA', { maximumFractionDigits: 2 });
  } catch {
    return String(n);
  }
}

export default function CartPage() {
  const [items, setItems] = React.useState<CartItem[]>([]);

  // Загрузка из localStorage + подписки на изменения из других вкладок/компонентов
  React.useEffect(() => {
    setItems(readCart());

    const onStorage = (e: StorageEvent) => {
      if (e.key === CART_KEY) setItems(readCart());
    };
    const onCustom = () => setItems(readCart());

    window.addEventListener('storage', onStorage);
    window.addEventListener('cart:changed', onCustom as EventListener);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('cart:changed', onCustom as EventListener);
    };
  }, []);

  const updateQty = (id: number, nextQty: number) => {
    setItems((prev) => {
      const updated = prev
        .map((it) => (it.id === id ? { ...it, qty: Math.max(1, Math.min(99, nextQty)) } : it))
        .filter(Boolean) as CartItem[];
      saveCart(updated);
      return updated;
    });
  };

  const removeItem = (id: number) => {
    setItems((prev) => {
      const updated = prev.filter((it) => it.id !== id);
      saveCart(updated);
      return updated;
    });
  };

  const clearCart = () => {
    setItems([]);
    saveCart([]);
  };

  const total = items.reduce((sum, it) => sum + it.price * it.qty, 0);

  return (
    <>
      <Header />
      <main
        style={{
          maxWidth: 1200,
          margin: '24px auto',
          padding: '0 16px',
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Кошик</h1>

        {items.length === 0 ? (
          // Пустая корзина
          <section
            aria-label="Порожній кошик"
            style={{
              background: '#fff',
              border: '1px solid #E6E6E6',
              borderRadius: 12,
              padding: 16,
              minHeight: 140,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#7a7a7a',
            }}
          >
            <span style={{ fontSize: 16 }}>тут будуть ваші товари</span>
          </section>
        ) : (
          // Есть позиции
          <section
            aria-label="Товари у кошику"
            style={{
              background: '#fff',
              border: '1px solid #E6E6E6',
              borderRadius: 12,
              padding: 0,
              overflow: 'hidden',
            }}
          >
            {/* Заголовок таблицы */}
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 80px 120px 40px',
                gap: 12,
                padding: '12px 16px',
                borderBottom: '1px solid #E6E6E6',
                fontWeight: 600,
                color: '#555',
              }}
            >
              <div>Товар</div>
              <div style={{ textAlign: 'center' }}>К-сть</div>
              <div style={{ textAlign: 'right' }}>Сума</div>
              <div></div>
            </div>

            {/* Строки товаров */}
            {items.map((it) => (
              <div
                key={it.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 80px 120px 40px',
                  gap: 12,
                  padding: '12px 16px',
                  borderBottom: '1px solid #F2F2F2',
                  alignItems: 'center',
                }}
              >
                {/* Товар */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {it.image ? (
                    <img
                      src={it.image}
                      alt={it.name}
                      width={56}
                      height={56}
                      style={{
                        width: 56,
                        height: 56,
                        objectFit: 'cover',
                        borderRadius: 8,
                        background: '#f6f6f6',
                        flex: '0 0 auto',
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: 56,
                        height: 56,
                        borderRadius: 8,
                        background: '#f6f6f6',
                        flex: '0 0 auto',
                      }}
                    />
                  )}

                  <div style={{ minWidth: 0 }}>
                    <Link href={`/products/${it.id}`} style={{
                      display: 'inline-block',
                      fontWeight: 600,
                      color: '#111827',
                      textDecoration: 'none',
                      maxWidth: '100%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {it.name}
                    </Link>
                    {it.category_name && (
                      <div style={{ fontSize: 12, color: '#6b7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {it.category_name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Количество */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => updateQty(it.id, it.qty - 1)}
                    aria-label="Зменшити кількість"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: '1px solid #E5E7EB',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    value={it.qty}
                    onChange={(e) => updateQty(it.id, Number(e.target.value))}
                    style={{
                      width: 48,
                      textAlign: 'center',
                      border: '1px solid #E5E7EB',
                      borderRadius: 6,
                      padding: '4px 6px',
                      outline: 'none',
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => updateQty(it.id, it.qty + 1)}
                    aria-label="Збільшити кількість"
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: '1px solid #E5E7EB',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    +
                  </button>
                </div>

                {/* Сумма по позиции */}
                <div style={{ textAlign: 'right', fontWeight: 600 }}>
                  {formatPrice(it.price * it.qty)} ₴
                </div>

                {/* Удаление */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    aria-label="Видалити товар"
                    onClick={() => removeItem(it.id)}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 6,
                      border: '1px solid #F87171',
                      color: '#B91C1C',
                      background: '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </section>
        )}

        {/* Підсумок і кнопки */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 16,
          }}
        >
          <div style={{ color: '#7a7a7a' }}>Підсумок</div>
          <div style={{ fontWeight: 700 }}>{formatPrice(total)} ₴</div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={clearCart}
            disabled={items.length === 0}
            style={{
              padding: '12px 16px',
              borderRadius: 10,
              border: '1px solid #E5E7EB',
              background: '#fff',
              color: '#374151',
              fontWeight: 600,
              cursor: items.length === 0 ? 'not-allowed' : 'pointer',
              opacity: items.length === 0 ? 0.6 : 1,
            }}
          >
            Очистити
          </button>

          <Link href={items.length ? '/orders' : '#'} aria-disabled={items.length === 0} style={{ textDecoration: 'none' }}>
            <button
              type="button"
              disabled={items.length === 0}
              style={{
                padding: '12px 24px',
                borderRadius: 10,
                border: 'none',
                background: '#1a5eff',
                color: '#fff',
                fontWeight: 600,
                cursor: items.length === 0 ? 'not-allowed' : 'pointer',
                opacity: items.length === 0 ? 0.6 : 1,
              }}
            >
              Замовити
            </button>
          </Link>
        </div>
      </main>
      <Footer />
    </>
  );
}