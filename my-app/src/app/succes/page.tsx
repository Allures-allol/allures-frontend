'use client';

import * as React from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import Header from '@/components/headers/header';
import Footer from '@/components/footers/footer';

const CART_KEY = 'allures_cart_v1';
const LEGACY_CART_KEY = 'cart_items';

// Cart item shape used to derive orders
type CartItem = {
  id: number | string;
  name: string;
  price: number;
  old_price?: number | null;
  image?: string | null;
  qty: number;
  category_name?: string | null;
};

export type Order = {
  orderId: string;
  userId: string;
  productId: string;
  quantity: number;
  totalPrice: number;
  companyId: string;
  deliveryAddress: string;
  status: 'pending' | 'approved' | 'shipped' | 'delivered' | 'canceled' | string;
  isPaid: boolean;
};

export default function SuccessPage() {
  const searchParams = useSearchParams();

  const [orders, setOrders] = React.useState<Order[]>([]);

  const queryOrder = searchParams.get('order')
    || searchParams.get('orderId')
    || searchParams.get('id')
    || searchParams.get('number');

  const orderNumber = React.useMemo(() => {
    if (queryOrder && queryOrder.trim()) return queryOrder.trim();
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('last_order_id');
      if (saved) return saved;
    }
    // fallback — сгенерируем 8‑значный номер
    const rnd = Math.floor(10000000 + Math.random() * 90000000);
    return String(rnd);
  }, [queryOrder]);

  // Очистим корзину и сохраним номер заказа локально (для повторного рендера, если нужно)
  React.useEffect(() => {
    try {
      if (typeof window === 'undefined') return;

      // 1) Собираем данные о платеже из query/local
      const payment = {
        paymentId: (searchParams.get('paymentId') || `pay-${Date.now()}`).toString(),
        orderId: (searchParams.get('orderId') || orderNumber || '000').toString(),
        userId: (searchParams.get('userId') || 'u-anon').toString(),
        companyId: (searchParams.get('companyId') || 'c-unknown').toString(),
        amount: Number(searchParams.get('amount') ?? 0),
        method: (searchParams.get('method') || 'card').toString(),
        status: (searchParams.get('status') || 'success').toString(),
        timestamp: (searchParams.get('timestamp') || new Date().toISOString()).toString(),
      };

      // 2) Читаем корзину ДО очистки
      let cart: CartItem[] = [];
      try {
        const raw = window.localStorage.getItem(CART_KEY);
        cart = raw ? JSON.parse(raw) : [];
        if (!Array.isArray(cart)) cart = [];
      } catch { cart = []; }

      // 3) Адрес доставки — пытаемся взять из разных ключей (если есть)
      const deliveryAddress =
        window.localStorage.getItem('checkout_delivery_address') ||
        window.localStorage.getItem('delivery_address') ||
        '';

      // 4) Строим список заказов из корзины (один товар = одна запись)
      const derivedOrders: Order[] = cart.map((it, idx) => ({
        orderId: String(orderNumber || payment.orderId || `ord-${Date.now()}`) + (cart.length > 1 ? `-${idx + 1}` : ''),
        userId: payment.userId,
        productId: String(it.id),
        quantity: Math.max(1, Number((it as any)?.qty ?? 1)),
        totalPrice: Number((it as any)?.price ?? 0) * Math.max(1, Number((it as any)?.qty ?? 1)),
        companyId: payment.companyId,
        deliveryAddress,
        status: payment.status === 'success' ? 'approved' : 'pending',
        isPaid: payment.status === 'success',
      }));

      // 5) Сохраняем computed orders в localStorage (история)
      try {
        const keyOrders = 'orders_history_v1';
        const rawOrders = window.localStorage.getItem(keyOrders);
        let listOrders: Order[] = [];
        try { listOrders = rawOrders ? JSON.parse(rawOrders) : []; } catch { listOrders = []; }
        if (!Array.isArray(listOrders)) listOrders = [] as Order[];
        // свежие сверху
        listOrders = [...derivedOrders, ...listOrders].slice(0, 100);
        window.localStorage.setItem(keyOrders, JSON.stringify(listOrders));
        setOrders(derivedOrders);
        // Debug: покажем, что сохранилось (удобно для Safari Web Inspector)
        try {
          if (process.env.NODE_ENV !== 'production') {
            const saved = window.localStorage.getItem(keyOrders);
            const arr = saved ? JSON.parse(saved) : [];
            console.groupCollapsed('[orders_history_v1] saved', Array.isArray(arr) ? arr.length : 0);
            // В Safari удобно смотреть таблицей
            if (Array.isArray(arr)) console.table(arr);
            else console.log(arr);
            console.groupEnd();
          }
        } catch {}
      } catch {}

      // 6) Сохраняем платежи (как было)
      try {
        window.localStorage.setItem('last_payment', JSON.stringify(payment));
        const key = 'payments_history_v1';
        const raw = window.localStorage.getItem(key);
        let list: any[] = [];
        try { list = raw ? JSON.parse(raw) : []; } catch { list = []; }
        if (!Array.isArray(list)) list = [];
        list.unshift(payment);
        if (list.length > 50) list = list.slice(0, 50);
        window.localStorage.setItem(key, JSON.stringify(list));
        // Debug: выведем платежи таблицей
        try {
          if (process.env.NODE_ENV !== 'production') {
            const savedPay = window.localStorage.getItem(key);
            const arrPay = savedPay ? JSON.parse(savedPay) : [];
            console.groupCollapsed('[payments_history_v1] saved', Array.isArray(arrPay) ? arrPay.length : 0);
            if (Array.isArray(arrPay)) console.table(arrPay);
            else console.log(arrPay);
            console.groupEnd();
          }
        } catch {}
      } catch {}

      // 7) Сохраняем номер заказа и очищаем корзину (после того как построили orders)
      window.localStorage.setItem('last_order_id', String(orderNumber));
      window.localStorage.removeItem(CART_KEY);
      window.localStorage.removeItem(LEGACY_CART_KEY);
      window.dispatchEvent(new Event('cart:changed'));
    } catch {}
  }, [orderNumber]);

  return (
    <>
      <Header />
      <main
        style={{
          minHeight: '60vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '40px 16px',
        }}
      >
        <div style={{ textAlign: 'center', maxWidth: 560 }}>
          <h1 style={{
            fontSize: 48,
            lineHeight: 1.1,
            margin: 0,
            color: '#1a5eff',
            fontWeight: 800,
          }}>
            Дякуємо!
          </h1>

          <p style={{ marginTop: 12, fontSize: 16, color: '#1a5eff' }}>
            Ваше замовлення успішно створено
          </p>

          <div style={{ marginTop: 8, fontSize: 13, color: '#6b7280' }}>
            Номер замовлення <span style={{ fontWeight: 600, color: '#111827' }}>{orderNumber}</span>
          </div>

          <div style={{ marginTop: 20 }}>
            <Link href="/" aria-label="На головну сторінку">
              <button
                type="button"
                style={{
                  padding: '10px 18px',
                  background: '#1a5eff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 999,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                На головну сторінку
              </button>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}