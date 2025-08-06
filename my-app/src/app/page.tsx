import React from "react";
import Image from "next/image";
import Header from "../components/headers/header";
import Footer from "../components/footers/footer";
import Link from "next/link";
import Partners from "../components/partners/partners";
type Product = {
  id: number;
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

async function getProducts(): Promise<Product[]> {
  try {
    const res = await fetch("https://api.alluresallol.com/products", {
      cache: "no-store",
    });
    const data = await res.json();
    return Array.isArray(data) ? data : [];
  } catch (err) {
    console.error("Ошибка при загрузке товаров:", err);
    return [];
  }
}

export default async function Home() {
  const products = await getProducts();

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
      <div
        className="categories-section"
        style={{ marginLeft: "170px", marginRight: "auto" }}
      >
        <h2 className="categories-section__title">Популярні товари</h2>
        <div className="categories-list">
          <button className="categories-list__button">Одяг та взуття</button>
          <button className="categories-list__button categories-list__button--active">Електроніка</button>
          <button className="categories-list__button">Спорт</button>
          <button className="categories-list__button">Іграшки</button>
          <button className="categories-list__button">Краса</button>
          <button className="categories-list__button">Меблі</button>
        </div>
      </div>
      <main style={{ padding: "20px", background: "#fafafa" }}>
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
          {products.slice(0, 4).map((p) => (
            <div
              key={p.id}
              style={{
                background: "#fff",
                borderRadius: "8px",
                padding: "16px",
                boxShadow: "0 2px 8px rgba(0,0,0,0.05)",
                position: "relative",
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
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
                }}
              >
                ♡
              </button>

              <img
                src={p.image}
                alt={p.name}
                style={{ width: "100%", height: "200px", objectFit: "contain" }}
              />

              <h3 style={{ margin: "12px 0", fontSize: 18 }}>{p.name}</h3>
              <p style={{ fontSize: 14, color: "#555" }}>{p.description}</p>

              <div style={{ margin: "12px 0" }}>
                {p.is_discount && (
                  <span style={{ textDecoration: "line-through", marginRight: 8 }}>
                    {p.old_price.toLocaleString("uk-UA")} ₴
                  </span>
                )}
                <span style={{ fontWeight: 700 }}>
                  {p.price.toLocaleString("uk-UA")} ₴
                </span>
              </div>

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
      </main>
      {/* Популярні категорії */}
      {(() => {
        const popularCategories = [
          { label: "Одяг та взуття", image: "/cross.png", gridColumn: "1 / span 2", gridRow: "1" },
          { label: "Електроніка", image: "/phone.png", gridColumn: "3", gridRow: "1" },
          { label: "Спорт", image: "/bottle.png", gridColumn: "4", gridRow: "1" },
          { label: "Іграшки", image: "/bear.png", gridColumn: "1", gridRow: "2" },
          { label: "Краса", image: "/cream.png", gridColumn: "2", gridRow: "2" },
          { label: "Меблі", image: "/sofa.png", gridColumn: "3 / span 2", gridRow: "2" },
        ];
        return (
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
        );
      })()}
      <Partners />
      <Footer />
      
    </>
  );
}