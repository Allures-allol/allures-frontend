'use client';
import React from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import Header from '../../../components/headers/header';
import Footer from '../../../components/footers/footer';

const CART_KEY = 'allures_cart_v1';

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

async function getReviews(productId: string): Promise<Review[]> {
  try {
    const res = await fetch(`https://api.alluresallol.com/review/product/${productId}`, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    const list: any[] = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.items)
      ? (data as any).items
      : Array.isArray((data as any)?.results)
      ? (data as any).results
      : [];

    return list
      .map((r: any): Review => ({
        id: Number(r?.id ?? 0),
        product_id: Number(r?.product_id ?? 0),
        user_id: Number(r?.user_id ?? 0),
        text: String(r?.text ?? ''),
        sentiment: String(r?.sentiment ?? ''),
        pos_score: Number(r?.pos_score ?? 0),
        neg_score: Number(r?.neg_score ?? 0),
        created_at: String(r?.created_at ?? ''),
      }))
      .filter((r) => Number.isFinite(r.id));
  } catch (e) {
    console.error('Ошибка загрузки отзывов:', e);
    return [];
  }
}

async function getProduct(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`https://api.alluresallol.com/product/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const raw = await res.json();
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
    return mapped;
  } catch (e) {
    console.error('Ошибка при загрузке товара:', e);
    return null;
  }
}

export default function ProductDetailPage() {
  const [product, setProduct] = React.useState<Product | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);
  const [reviews, setReviews] = React.useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = React.useState<boolean>(true);
  const params = useParams<{ id: string }>();
  const id = (params?.id as string) || '';

  const router = useRouter();

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

  // placeholder.png — запасна картинка, повинна бути в public/
  const imageUrl = product.image
    ? (product.image.startsWith('http') ? product.image : `https://api.alluresallol.com${product.image}`)
    : '/placeholder.png';

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
          href={`/products?category=${encodeURIComponent(product.category_name || '')}`}
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
            {imageUrl && (
              <div style={{ position: 'relative' }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={imageUrl}
                  alt={product.name}
                  width={600}
                  height={600}
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
              </div>
            )}
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
              <span style={{ marginLeft: 'auto', fontSize: 20, cursor: 'pointer' }}>⚖️</span>
              <span style={{ fontSize: 20, cursor: 'pointer' }}>❤</span>
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
          <h2>Відгуки</h2>

          {reviewsLoading && (
            <div style={{ padding: '12px 0', color: '#6b7280' }}>Завантаження відгуків…</div>
          )}

          {!reviewsLoading && reviews.length === 0 && (
            <div style={{ padding: '12px 0', color: '#6b7280' }}>Поки що немає відгуків</div>
          )}

          {!reviewsLoading && reviews.length > 0 && (
            <div style={{ display: 'grid', gap: 12 }}>
              {reviews.map((r) => {
                const badgeColor = r.sentiment === 'positive' ? '#22c55e' : r.sentiment === 'negative' ? '#ef4444' : '#6b7280';
                const created = r.created_at ? new Date(r.created_at).toLocaleString('uk-UA') : '';
                return (
                  <article key={r.id} style={{
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                    padding: 12,
                    background: '#fff',
                  }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontWeight: 600 }}>Користувач #{r.user_id}</span>
                      {created && <span style={{ color: '#6b7280', fontSize: 12 }}>{created}</span>}
                      <span style={{ marginLeft: 'auto', fontSize: 12, fontWeight: 600, color: badgeColor, border: `1px solid ${badgeColor}`, borderRadius: 999, padding: '2px 8px' }}>
                        {r.sentiment}
                      </span>
                    </div>
                    <p style={{ margin: 0, lineHeight: 1.6 }}>{r.text}</p>
                    <div style={{ marginTop: 8, color: '#6b7280', fontSize: 12 }}>
                      Позитив: {r.pos_score.toFixed(2)} • Негатив: {r.neg_score.toFixed(2)}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </main>

      <Footer />
    </>
  );
}
