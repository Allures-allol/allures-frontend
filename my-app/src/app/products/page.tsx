'use client';
// src/app/products/[category]/page.tsx
import React from 'react';
import Link from 'next/link';
import Header from './../../components/headers/header';
import Footer from './../../components/footers/footer';
import styles from './products.module.css';
import { useSearchParams } from 'next/navigation';

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

function getProductsByCategory(
  category: string,
  offset = 0,
  limit = 20
): Promise<{ products: Product[]; total: number }> {
  const qs = `offset=${offset}&limit=${limit}&sort=-id`;
  // Некоторые конфигурации серверов отдают 405 при наличии лишних слэшей / preflight.
  // Делаем несколько попыток с разными URL без дополнительных заголовков.
  const candidates = [
    `https://api.alluresallol.com/product/products?${qs}`,
    `https://api.alluresallol.com/product/products/?${qs}`,
  ];

  const tryFetch = async (url: string) => {
    const res = await fetch(url, {
      // без кастомных заголовков, чтобы не триггерить preflight
      method: 'GET',
      cache: 'no-store',
      // mode: 'cors' // по умолчанию
    });
    if (!res.ok) {
      const raw = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${res.statusText} :: ${raw.slice(0, 160)}`);
    }
    return res.json();
  };

  return (async () => {
    let data: any = null;
    let lastErr: any = null;
    for (const u of candidates) {
      try {
        data = await tryFetch(u);
        break;
      } catch (e) {
        lastErr = e;
      }
    }
    if (!data) {
      console.error('API error:', lastErr);
      return { products: [], total: 0 };
    }

    const list: any[] = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data)
      ? data
      : (Array.isArray(data?.results) ? data.results : []);

    // Фильтрация по категории: по имени категории или её id
    const normalized = (category || '').toString().trim().toLowerCase();
    const imageFiltered = list.filter((p: any) => p?.image && String(p.image).trim() !== '');

    const filtered = normalized
      ? imageFiltered.filter((p: any) => {
          const name = (p.category_name || '').toString().toLowerCase();
          const idStr = (p.category_id != null ? String(p.category_id) : '').toLowerCase();
          return name === normalized || idStr === normalized;
        })
      : imageFiltered;

    return {
      products: filtered.map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description,
        price: p.price,
        old_price: p.old_price,
        image: p.image,
        is_discount: p.is_discount,
      })),
      total: filtered.length,
    };
  })().catch((err) => {
    console.error('Ошибка при загрузке товарів:', err);
    return { products: [], total: 0 };
  });
}

async function getAllProducts(offset = 0, limit = 20): Promise<{ products: Product[]; total: number }> {
  try {
    // Берём всё и пагинируем на клиенте (API может не поддерживать offset/limit здесь)
    const res = await fetch('https://api.alluresallol.com/product/all', {
      method: 'GET',
      cache: 'no-store',
    });
    if (!res.ok) {
      const raw = await res.text().catch(() => '');
      console.error('API error /product/all:', res.status, res.statusText, raw.slice(0, 200));
      return { products: [], total: 0 };
    }
    const data = await res.json();
    const list: any[] = Array.isArray(data) ? data : (Array.isArray(data?.items) ? data.items : (Array.isArray(data?.results) ? data.results : []));

    // Только с картинкой
    const withImage = list.filter((p: any) => p?.image && String(p.image).trim() !== '');

    const mapped: Product[] = withImage.map((p: any) => ({
      id: Number(p.id),
      company_id: p.company_id ?? undefined,
      name: String(p.name ?? ''),
      description: p.description ?? undefined,
      price: Number(p.price ?? 0),
      status: p.status ?? undefined,
      current_inventory: typeof p.current_inventory === 'number' ? p.current_inventory : undefined,
      category_id: typeof p.category_id === 'number' ? p.category_id : undefined,
      category_name: p.category_name ?? undefined,
      old_price: typeof p.old_price === 'number' ? p.old_price : undefined,
      image: String(p.image),
      subcategory: p.subcategory ?? undefined,
      product_type: p.product_type ?? undefined,
      is_hit: Boolean(p.is_hit),
      is_discount: Boolean(p.is_discount),
      is_new: Boolean(p.is_new),
      created_at: p.created_at ?? undefined,
      updated_at: p.updated_at ?? undefined,
    }));

    const total = mapped.length;
    const page = mapped.slice(offset, offset + limit);
    return { products: page, total };
  } catch (err) {
    console.error('Ошибка при загрузке всех товаров:', err);
    return { products: [], total: 0 };
  }
}

export default function CategoryPage({ params }: any) {
  const [products, setProducts] = React.useState<Product[]>([]);
  const [totalCount, setTotalCount] = React.useState(0);

  const searchParams = useSearchParams();
  const offsetParam = React.useMemo(() => {
    const v = parseInt(searchParams.get('offset') || '0', 10);
    return Number.isFinite(v) && v >= 0 ? v : 0;
  }, [searchParams]);
  const limitParam = React.useMemo(() => {
    const v = parseInt(searchParams.get('limit') || '20', 10);
    return Number.isFinite(v) && v > 0 ? v : 20;
  }, [searchParams]);

  React.useEffect(() => {
    const hasCategory = Boolean(params?.category);
    const loader = hasCategory
      ? getProductsByCategory(params.category, offsetParam, limitParam)
      : getAllProducts(offsetParam, limitParam);

    loader
      .then(({ products, total }) => {
        setProducts(products);
        setTotalCount(total);
        if (process.env.NODE_ENV !== 'production') {
          console.log('[Products] loaded:', { total, pageCount: products.length, offset: offsetParam, limit: limitParam });
        }
      })
      .catch((e) => console.error('Load products error:', e));
  }, [params?.category, offsetParam, limitParam]);

  const handleAddToCart = React.useCallback((p: Product) => {
    try {
      const raw = window.localStorage.getItem(CART_KEY);
      const list = raw ? JSON.parse(raw) : [];
      const idx = Array.isArray(list) ? list.findIndex((x: any) => Number(x?.id) === Number(p.id)) : -1;
      if (idx >= 0) {
        const current = list[idx]?.qty || 1;
        list[idx].qty = Math.min(99, current + 1);
      } else {
        list.push({
          id: p.id,
          name: p.name,
          price: p.price,
          old_price: typeof p.old_price === 'number' ? p.old_price : null,
          image: p.image || null,
          qty: 1,
          category_name: p.category_name || null,
        });
      }
      window.localStorage.setItem(CART_KEY, JSON.stringify(list));
      window.dispatchEvent(new Event('cart:changed'));
    } catch (e) {
      console.error('addToCart error:', e);
    }
  }, []);

  const pages = Math.max(1, Math.ceil(totalCount / limitParam));
  const basePath = params?.category ? `/products/${params.category}` : '/products';

  return (
    <>
      <Header />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <Link href="/">🏠</Link>
        <span className={styles.separator}>&gt;</span>
        <Link href="/products">Електроніка</Link>
        <span className={styles.separator}>&gt;</span>
        <span>{params.category}</span>
      </div>

      <main className={styles.main}>
        {/* Sidebar filters */}
        <aside className={styles.sidebar}>
          <div className={styles.filterSection}>
            <h4>Бренд</h4>
            <input type="text" placeholder="Пошук..." className={styles.searchBox} />
            {['Acer','Apple','ASUS','Dell','HP','Huawei','Lenovo','Microsoft','Samsung','Xiaomi'].map(b => (
              <label key={b} className={styles.checkboxLabel}>
                <input type="checkbox" /> {b}
              </label>
            ))}
          </div>
          <div className={styles.filterSection}>
            <h4>Ціна</h4>
            <div className={styles.priceInputs}>
              <input type="number" placeholder="Від" className={styles.priceInput}/>
              <input type="number" placeholder="До" className={styles.priceInput}/>
            </div>
          </div>
          <div className={styles.filterSection}>
            <h4>Об'єм оперативної пам'яті</h4>
            {['4–8 ГБ','8–16 ГБ','16–24 ГБ','24+ ГБ'].map(r => (
              <label key={r} className={styles.checkboxLabel}>
                <input type="checkbox" /> {r}
              </label>
            ))}
          </div>
          <div className={styles.filterSection}>
            <h4>Процесор</h4>
            {['Intel Core i5','Intel Core i7','AMD Ryzen 5','AMD Ryzen 7','M2','M4'].map(p => (
              <label key={p} className={styles.checkboxLabel}>
                <input type="checkbox" /> {p}
              </label>
            ))}
          </div>
          <div className={styles.filterSection}>
            <h4>Діагональ екрану</h4>
            {['12"','13"','14"','15"','16"','17+"'].map(d => (
              <label key={d} className={styles.checkboxLabel}>
                <input type="checkbox" /> {d}
              </label>
            ))}
          </div>
          <div className={styles.filterSection}>
            <h4>ОС</h4>
            {['Windows 10','Windows 11','MacOS','Linux'].map(o => (
              <label key={o} className={styles.checkboxLabel}>
                <input type="checkbox" /> {o}
              </label>
            ))}
          </div>
        </aside>

        {/* Product grid */}
        <section className={styles.products}>
          <h1 className={styles.title}>{params.category}</h1>
          <span className={styles.count}>Знайдено {totalCount} товарів</span>
          <div className={styles.grid}>
            {products.map((p) => (
              <div key={p.id} className={styles.card}>
                <Link href={`/products/${p.id}`} className={styles.cardLink} aria-label={p.name}>
                  <img src={p.image} alt={p.name} className={styles.image} />
                  <h3 className={styles.name}>{p.name}</h3>
                </Link>

                <p className={styles.price}>
                  {p.is_discount && (
                    <span className={styles.oldPrice}>
                      {p.old_price?.toLocaleString('uk-UA')} ₴
                    </span>
                  )}
                  <span className={styles.currentPrice}>
                    {p.price.toLocaleString('uk-UA')} ₴
                  </span>
                </p>

                <div style={{ display: 'flex', gap: 8 }}>
                  <Link href={`/products/${p.id}`} className={styles.detailBtn}>
                    Деталі
                  </Link>
                  <button
                    type="button"
                    onClick={() => handleAddToCart(p)}
                    className={styles.detailBtn}
                    aria-label={`Додати ${p.name} до кошика`}
                    style={{ cursor: 'pointer' }}
                  >
                    В кошик
                  </button>
                </div>
              </div>
            ))}
          </div>
          {products.length === 0 && (
            <div style={{ padding: '12px 0', color: '#6b7280' }}>
              Немає товарів для відображення. Перевірте доступність API або параметри фільтрації.
            </div>
          )}
          <div className={styles.pagination}>
            {Array.from({ length: pages }).map((_, i) => (
              <Link
                key={i}
                href={`${basePath}?offset=${i * limitParam}&limit=${limitParam}`}
                className={i * limitParam === offsetParam ? styles.activePage : ''}
              >
                {i + 1}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
