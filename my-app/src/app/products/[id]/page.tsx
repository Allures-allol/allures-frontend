'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import Header from '../../../components/headers/header';
import Footer from '../../../components/footers/footer';
import AddToCartButton from '../../../components/cart/AddToCartButton';

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  old_price: number;
  image: string;
  is_discount: boolean;
  category_name: string;
};

async function getProduct(id: string): Promise<Product | null> {
  try {
    const res = await fetch(`https://api.alluresallol.com/product/products/${id}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const raw = await res.json();
    const mapped: Product = {
      id: Number(raw.id),
      name: String(raw.name ?? ''),
      description: String(raw.description ?? ''),
      price: Number(raw.price ?? 0),
      old_price: Number(raw.old_price ?? 0),
      image: String(raw.image ?? ''),
      is_discount: Boolean(raw.is_discount),
      category_name: String(raw.category_name ?? ''),
    };
    return mapped;
  } catch (e) {
    console.error('Ошибка при загрузке товара:', e);
    return null;
  }
}

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const id = (params?.id as string) || '';

  const [product, setProduct] = React.useState<Product | null>(null);
  const [loading, setLoading] = React.useState<boolean>(true);

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
          href={`/products?category=${encodeURIComponent(product.category_name)}`}
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
              <Image
                src={imageUrl}
                alt={product.name}
                width={600}
                height={600}
                style={{ borderRadius: 8, objectFit: 'contain', width: '100%', height: 'auto' }}
                priority
              />
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
              <button style={tabBtnBaseStyle}>Відгуки (102)</button>
            </div>

            <h1 style={{ margin: 0, fontSize: 24 }}>{product.name}</h1>
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
            <p style={{ color: '#0070f3', marginBottom: 16 }}>Є в наявності</p>

            {/* Price & actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
              <AddToCartButton
                id={product.id}
                name={product.name}
                price={product.price}
                image={product.image}
                goToCart
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
              </AddToCartButton>

              <AddToCartButton
                id={product.id}
                name={product.name}
                price={product.price}
                image={product.image}
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
              </AddToCartButton>
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
                <td style={{ padding: 8, borderBottom: '1px solid #eee' }}>{product.category_name}</td>
              </tr>
            </tbody>
          </table>
        </section>

        {/* Reviews */}
        <section style={{ marginTop: 40, marginBottom: 40 }}>
          <h2>Відгуки</h2>
          <p>Тут будуть відгуки користувачів...</p>
        </section>
      </main>

      <Footer />
    </>
  );
}
