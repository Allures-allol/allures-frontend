// src/app/products/[category]/page.tsx
import React from 'react';
import Link from 'next/link';
import Header from './../../components/headers/header';
import Footer from './../../components/footers/footer';
import styles from './products.module.css';

type Product = {
  id: number;
  name: string;
  description: string;
  price: number;
  old_price: number;
  image: string;
  is_discount: boolean;
};

async function getProductsByCategory(category: string): Promise<Product[]> {
  try {
    const res = await fetch('https://api.alluresallol.com/product/products/?offset=0&limit=20&sort=-id', {
      cache: 'no-store',
      headers: { accept: 'application/json' },
    });

    if (!res.ok) {
      const raw = await res.text();
      console.error('API error:', res.status, res.statusText, raw.slice(0, 200));
      return [];
    }

    const data = await res.json();

    const list: any[] = Array.isArray(data?.items)
      ? data.items
      : Array.isArray(data)
      ? data
      : [];

    // Фильтрация по категории без изменения верстки: пытаемся сопоставить по имени или id
    const normalized = (category || '').toString().trim().toLowerCase();
    const filtered = normalized
      ? list.filter((p: any) => {
          const name = (p.category_name || '').toString().toLowerCase();
          const idStr = (p.category_id != null ? String(p.category_id) : '').toLowerCase();
          return name === normalized || idStr === normalized;
        })
      : list;

    // Приводим к ожидаемой форме Product без изменения разметки
    return filtered.map((p: any) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      old_price: p.old_price,
      image: p.image,
      is_discount: p.is_discount,
    })) as Product[];
  } catch (err) {
    console.error('Ошибка при загрузке товарів:', err);
    return [];
  }
}

export default async function CategoryPage({ params }: any) {
  const products = await getProductsByCategory(params.category);

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
          <span className={styles.count}>Знайдено {products.length} товарів</span>
          <div className={styles.grid}>
            {products.map(p => (
              <Link href={`/products/${p.id}`} key={p.id} className={styles.cardLink}>
                <div className={styles.card}>
                  <img src={p.image} alt={p.name} className={styles.image}/>
                  <h3 className={styles.name}>{p.name}</h3>
                  <p className={styles.price}>
                    {p.is_discount && (
                      <span className={styles.oldPrice}>
                        {p.old_price.toLocaleString('uk-UA')} ₴
                      </span>
                    )}
                    <span className={styles.currentPrice}>
                      {p.price.toLocaleString('uk-UA')} ₴
                    </span>
                  </p>
                  <div className={styles.detailBtn}>Деталі</div>
                </div>
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </>
  );
}
