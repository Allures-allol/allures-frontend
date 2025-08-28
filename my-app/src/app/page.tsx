import React from "react";
import Image from "next/image";
import Header from "../components/headers/header";
import Footer from "../components/footers/footer";
import Link from "next/link";
import Partners from "../components/partners/partners";
type Product = {
  id: number;
  company_id?: number;
  name: string;
  description: string;
  price: number;
  old_price: number;
  image: string;
  status: string;
  current_inventory: number;
  is_hit: boolean;
  is_discount: boolean;
  is_new: boolean;
  created_at: string;
  updated_at: string;
  category_id: number;
  category_name: string;
  subcategory: string;
  product_type: string;
};
const popularCategories = [
  { label: "Одяг та взуття", image: "/cross.png", gridColumn: "1 / span 2", gridRow: "1" },
  { label: "Електроніка", image: "/phone.png", gridColumn: "3", gridRow: "1" },
  { label: "Спорт", image: "/bottle.png", gridColumn: "4", gridRow: "1" },
  { label: "Іграшки", image: "/bear.png", gridColumn: "1", gridRow: "2" },
  { label: "Краса", image: "/cream.png", gridColumn: "2", gridRow: "2" },
  { label: "Меблі", image: "/sofa.png", gridColumn: "3 / span 2", gridRow: "2" },
] as const;

const fmtUA = (n: unknown) => {
  const num = typeof n === 'string' ? Number(n) : (n as number);
  return Number.isFinite(num) ? (num as number).toLocaleString('uk-UA') : '—';
};

const imgSrc = (src?: string | null) => {
  if (!src) return '/placeholder.png';
  if (src.startsWith('http')) return src;
  // если API отдаёт относительный путь — подцепим домен
  return `https://api.alluresallol.com${src.startsWith('/') ? '' : '/'}${src}`;
};

const catSectionStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '24px 0 0 170px',
};
const catTitleStyle: React.CSSProperties = {
  fontSize: 20,
  fontWeight: 700,
  margin: '0 0 10px 0',
  color: '#0f172a',
};
const catListStyle: React.CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  alignItems: 'center',
  gap: 10,
};
const catBtnBase: React.CSSProperties = {
  appearance: 'none',
  WebkitAppearance: 'none',
  border: '1px solid #3b70f6',
  background: '#ffffff',
  color: '#3b70f6',
  padding: '8px 14px',
  borderRadius: 9999,
  fontSize: 14,
  lineHeight: 1,
  fontWeight: 500,
  cursor: 'pointer',
  transition: 'background-color .15s ease, color .15s ease, box-shadow .15s ease, transform .05s ease',
  boxShadow: '0 0 0 0 rgba(59,112,246,0.35)',
  userSelect: 'none',
  whiteSpace: 'nowrap',
};
const catBtnActive: React.CSSProperties = {
  ...catBtnBase,
  background: 'linear-gradient(180deg, #3b70f6 0%, #2f60e3 100%)',
  color: '#ffffff',
  borderColor: 'transparent',
  boxShadow: '0 6px 14px rgba(59,112,246,0.32), inset 0 -2px 0 rgba(0,0,0,0.15)',
};

async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch('https://api.alluresallol.com/product/all', {
      method: 'GET',
      cache: 'no-store',
      // @ts-ignore
      next: { revalidate: 0 },
    });

    if (!res.ok) {
      const raw = await res.text().catch(() => '');
      console.error('API /product/all error:', res.status, res.statusText, raw.slice(0, 200));
      return [];
    }

    const data = await res.json();
    const list: any[] = Array.isArray(data)
      ? data
      : Array.isArray((data as any)?.items)
      ? (data as any).items
      : Array.isArray((data as any)?.results)
      ? (data as any).results
      : [];

    if (!Array.isArray(list)) return [];

    // Берём только товары с картинкой, чтобы карточки выглядели корректно
    const withImage = list.filter((p: any) => p?.image && String(p.image).trim() !== '');

    const mapped: Product[] = withImage.map((p: any) => ({
      id: Number(p.id ?? 0),
      company_id: typeof p.company_id === 'number' ? p.company_id : undefined,
      name: String(p.name ?? ''),
      description: String(p.description ?? ''),
      price: Number(p.price ?? 0),
      old_price: Number(p.old_price ?? 0),
      image: String(p.image ?? ''),
      status: String(p.status ?? ''),
      current_inventory: Number(p.current_inventory ?? 0),
      is_hit: Boolean(p.is_hit),
      is_discount: Boolean(p.is_discount),
      is_new: Boolean(p.is_new),
      created_at: String(p.created_at ?? ''),
      updated_at: String(p.updated_at ?? ''),
      category_id: Number(p.category_id ?? 0),
      category_name: String(p.category_name ?? ''),
      subcategory: String(p.subcategory ?? ''),
      product_type: String(p.product_type ?? ''),
    }));

    return mapped;
  } catch (err) {
    console.error('Ошибка при загрузке товаров (/product/all):', err);
    return [];
  }
}

export default async function Home() {
  const products = await getProducts();
  const productsSafe = Array.isArray(products) ? products : [];

  return (
    <>
      <Header />
      <div style={{ display: "flex", gap: "20px", marginTop: "15px", marginLeft: "170px" }}>
        <div style={{ width: "480px", height: "330px", position: "relative", opacity: 1 }}>
          <Image
            src="/baner1.png"
            alt="Літо в розпалі - знижки до 70%"
            fill
            style={{ objectFit: "cover", borderRadius: "16px" }}
          />
        </div>
        <div style={{ width: "480px", height: "330px", position: "relative", opacity: 1 }}>
          <Image
            src="/baner2.png"
            alt="Літо в розпалі - нові колекції"
            fill
            style={{ objectFit: "cover", borderRadius: "16px" }}
          />
        </div>
      </div>
      {/* Популярні товари */}
      <div style={catSectionStyle}>
        <h2 style={catTitleStyle}>Популярні товари</h2>
        <div style={catListStyle}>
          <button style={catBtnBase}>Одяг та взуття</button>
          <button style={catBtnActive}>Електроніка</button>
          <button style={catBtnBase}>Спорт</button>
          <button style={catBtnBase}>Іграшки</button>
          <button style={catBtnBase}>Краса</button>
          <button style={catBtnBase}>Меблі</button>
        </div>
      </div>
      <main style={{ padding: "20px", background: "#fafafa", fontFamily:"sans-serif"}}>
        <h1 style={{ textAlign: "center", fontSize: 32, fontWeight: 700 }}>
          Маркетплейс
        </h1>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 256px)",
            justifyContent: "center",
            columnGap: "5px",
            margin: "40px auto 0",
          }}
        >
          {productsSafe.slice(0, 4).map((p) => (
            <div
              key={p.id}
              style={{
                position: "relative",
                height: "380px",
              }}
            >
              <button
                style={{
                  position: "absolute",
                  top: "12px",
                  right: "12px",
                  background: "transparent",
                  border: "none",
                  fontSize: "20px",
                  cursor: "pointer",
                  zIndex: 2,
                }}
              >
                ♡
              </button>
              <Link href={`/products/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div
                  style={{
                    background: "#fff",
                    borderRadius: "8px",
                    padding: "16px",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    height: "380px",
                  }}
                >
                  <img
                    src={imgSrc(p.image)}
                    alt={p.name || 'product'}
                    loading="lazy"
                    decoding="async"
                    style={{ width: "100%", height: "200px", objectFit: "contain" }}
                  />

                  <h3 style={{ margin: "12px 0", fontSize: 18 }}>{p.name}</h3>
                  <p style={{ fontSize: 14, color: "#555" }}>{p.description}</p>

                  <div style={{ margin: "12px 0" }}>
                    {p.is_discount && Number(p.old_price) > 0 && (
                      <span style={{ textDecoration: "line-through", marginRight: 8 }}>
                        {fmtUA(p.old_price)} ₴
                      </span>
                    )}
                    <span style={{ fontWeight: 700 }}>
                      {fmtUA(p.price)} ₴
                    </span>
                  </div>
                </div>
              </Link>
              <button
                style={{
                  position: "absolute",
                  bottom: "16px",
                  left: "16px",
                  right: "16px",
                  background: "#0070f3",
                  color: "#fff",
                  border: "none",
                  borderRadius: "4px",
                  padding: "12px 0",
                  cursor: "pointer",
                  textAlign: "center",
                  zIndex: 2,
                }}
              >
                В корзину
              </button>
            </div>
          ))}
          <Link href="/products" key="view-all">
            <div
              style={{
                background: "#3b70f6",
                borderRadius: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#fff",
                fontSize: "18px",
                fontWeight: 600,
                height: "380px",
              }}
            >
              Дивитись все →
            </div>
          </Link>
        </div>
        {productsSafe.length === 0 && (
          <p style={{ textAlign: 'center', color: '#888', marginTop: 24 }}>
            Не вдалося завантажити товари. Перевірте API або оновіть сторінку.
          </p>
        )}
      </main>
      {/* Популярні категорії */}
      <section style={{ maxWidth: "1000px", margin: "20px auto", padding: "0 20px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "16px" }}>
          Популярні категорії
        </h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gridTemplateRows: "150px 150px",
            gap: "10px",
          }}
        >
          {popularCategories.map((cat, idx) => (
            <div
              key={idx}
              style={{
                gridColumn: cat.gridColumn,
                gridRow: cat.gridRow,
                height: "150px",
                position: "relative",
                overflow: "hidden",
                borderRadius: "12px",
                background: "#f5f5f5",
              }}
            >
              <img
                src={cat.image}
                alt={cat.label}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  top: "12px",
                  left: "12px",
                  color: "#000",
                  fontSize: "16px",
                  fontWeight: 500,
                  background: "transparent",
                }}
              >
                {cat.label}
              </span>
            </div>
          ))}
        </div>
      </section>
      <Partners />
      <Footer />
      
    </>
  );
}