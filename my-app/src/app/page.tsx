import React from "react";
import Image from "next/image";
import Header from "../components/headers/header";
import Footer from "../components/footers/footer";
import Link from "next/link";
import Partners from "../components/partners/partners";
import Script from "next/script";
export const runtime = 'nodejs';
export const revalidate = 120; // Enable ISR: re-generate home every 2 minutes
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
const containerStyle: React.CSSProperties = {
  maxWidth: '1200px',
  margin: '0 auto',
  padding: '0 16px',
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
  const trimmed = String(src).trim();
  // If API returns a directory-like path or ends with a trailing slash, avoid requesting it (will 404)
  if (!trimmed || /^(\/)?product\/?$/i.test(trimmed) || /\/$/.test(trimmed)) {
    return '/placeholder.png';
  }
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  // If API returns a relative path — attach domain safely
  return `https://api.alluresallol.com${trimmed.startsWith('/') ? '' : '/'}${trimmed}`;
};

const catSectionStyle: React.CSSProperties = {
  ...containerStyle,
  margin: '24px auto 0',
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
  const urls = [
    'https://api.alluresallol.com/product/',
    'https://api.alluresallol.com/product',
    'https://api.alluresallol.com/product?limit=60&offset=0&sort=-id',
    'https://api.alluresallol.com/product/all',
  ];

  const tryFetch = async (url: string) => {
    try {
      const res = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) {
        const raw = await res.text().catch(() => '');
        console.error('API product fetch error:', url, res.status, res.statusText, raw.slice(0, 160));
        return null;
      }
      const data = await res.json().catch(() => null);
      if (!data) return null;
      const list: any[] = Array.isArray(data)
        ? data
        : Array.isArray((data as any)?.items)
        ? (data as any).items
        : Array.isArray((data as any)?.results)
        ? (data as any).results
        : Array.isArray((data as any)?.data)
        ? (data as any).data
        : [];
      if (!Array.isArray(list)) return null;

      const mapped: Product[] = list.map((p: any) => ({
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

      // Newest first as a sensible default
      mapped.sort((a, b) => (new Date(b.created_at).getTime() || 0) - (new Date(a.created_at).getTime() || 0));
      return mapped;
    } catch (err) {
      console.error('fetch fail:', url, err);
      return null;
    }
  };

  for (const u of urls) {
    const got = await tryFetch(u);
    if (Array.isArray(got)) return got;
  }

  return [];
}

export default async function Home() {
  const products = await getProducts();
  const productsSafe = Array.isArray(products) ? products : [];

  return (
    <>
      <Script id="profile-auth-gate" strategy="afterInteractive">{`
  (function(){
    if (typeof window === 'undefined') return;

    // Catch most possible profile triggers
    var SELECTOR = [
      '[data-profile-icon]',
      '#profile-icon',
      'button[data-profile-icon]',
      'a[href="/profile"]',
      'a[href^="/profile"]',
      'a[href*="/profile"]',
      'a[href="/auth"]',
      '[data-testid="profile-icon"]',
      '[aria-label="profile"]',
      '[aria-label*="проф"]',
      '[aria-label*="profile"]'
    ].join(',');

    function log(){ try { console.log.apply(console, ['[auth-gate]'].concat([].slice.call(arguments))); } catch(_){} }
    function warn(){ try { console.warn.apply(console, ['[auth-gate]'].concat([].slice.call(arguments))); } catch(_){} }

    function readTokenFromUserObj(){
      try {
        var userRaw = localStorage.getItem('user') || localStorage.getItem('currentUser');
        if (!userRaw) return '';
        var u = JSON.parse(userRaw);
        return u?.token || u?.jwt || u?.access_token || u?.accessToken || '';
      } catch(_) { return ''; }
    }

    function getToken(){
      try {
        var keys = [
          'token','authToken','access_token','accessToken','jwt','jwtToken','userToken','bearerToken','sessionToken'
        ];
        var token = '';
        for (var i=0;i<keys.length && !token;i++) token = localStorage.getItem(keys[i]) || '';
        if (!token) token = readTokenFromUserObj();
        if (!token) return '';
        token = String(token).replace(/^\"|\"$/g, '').trim();

        var exp = localStorage.getItem('token_expires_at') || localStorage.getItem('tokenExpiresAt');
        if (exp) {
          var ts = Number(exp);
          if (!isNaN(ts) && Date.now() > ts) {
            warn('token expired');
            try {
              keys.concat(['token_expires_at','tokenExpiresAt']).forEach(function(k){ localStorage.removeItem(k); });
            } catch(_){}
            return '';
          }
        }
        return token;
      } catch (e) {
        warn('getToken error', e);
        return '';
      }
    }

    function authCheckAndNavigate(){
      var token = getToken();
      if (!token) { log('no token -> /auth'); window.location.href = '/auth'; return; }
      var url = 'https://api.alluresallol.com/auth/me';

      function go(dest){ log('navigate', dest); window.location.href = dest; }

      function tryWith(scheme){
        log('fetch', scheme);
        return fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': scheme + ' ' + token,
            'Accept': 'application/json',
            'Cache-Control': 'no-store'
          },
          credentials: 'include',
          mode: 'cors'
        });
      }

      // Try schemes in order: Bearer -> JWT -> Token
      tryWith('Bearer')
        .then(function(res){
          if (res && res.ok) { go('/profile'); return null; }
          if (res && (res.status === 401 || res.status === 403)) {
            return tryWith('JWT').then(function(r2){
              if (r2 && r2.ok) { go('/profile'); return null; }
              if (r2 && (r2.status === 401 || r2.status === 403)) {
                return tryWith('Token').then(function(r3){
                  if (r3 && r3.ok) { go('/profile'); } else { go('/auth'); }
                });
              }
              go('/auth');
            });
          }
          go('/auth');
        })
        .catch(function(err){
          warn('fetch error (Bearer)', err);
          tryWith('JWT')
            .then(function(r2){ if (r2 && r2.ok) { go('/profile'); } else { return tryWith('Token').then(function(r3){ if (r3 && r3.ok) { go('/profile'); } else { go('/auth'); } }); } })
            .catch(function(err2){ warn('fetch error (JWT)', err2); go('/auth'); });
        });
    }

    function onClick(e){
      try {
        var t = e.target;
        if (!t || !(t instanceof Element)) return;
        var trigger = t.closest(SELECTOR);
        if (!trigger) return;

        e.preventDefault();
        e.stopPropagation();
        log('intercept click on', trigger);
        authCheckAndNavigate();
      } catch (err) {
        warn('handler error', err);
        window.location.href = '/auth';
      }
    }

    document.addEventListener('click', onClick, true);
    log('initialized');
  })();
`}</Script>
      <Header />
      <div style={{ ...containerStyle, marginTop: 16 }}>
        <div className="bannersGrid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
          <div className="banner" style={{ width: "100%", height: 330, position: "relative", opacity: 1 }}>
            <Image
              src="/baner1.png"
              alt="Літо в розпалі - знижки до 70%"
              fill
              style={{ objectFit: "cover", borderRadius: 16 }}
            />
          </div>
          <div className="banner" style={{ width: "100%", height: 330, position: "relative", opacity: 1 }}>
            <Image
              src="/baner2.png"
              alt="Літо в розпалі - нові колекції"
              fill
              style={{ objectFit: "cover", borderRadius: 16 }}
            />
          </div>
        </div>
      </div>
      {/* Популярні товари */}
      <div style={catSectionStyle}>
        <h2 style={catTitleStyle}>Популярні товари</h2>
        <div style={catListStyle} data-cat-list>
          <button style={catBtnBase}>Одяг та взуття</button>
          <button style={catBtnActive}>Електроніка</button>
          <button style={catBtnBase}>Спорт</button>
          <button style={catBtnBase}>Іграшки</button>
          <button style={catBtnBase}>Краса</button>
          <button style={catBtnBase}>Меблі</button>
        </div>
      </div>
      <main style={{ background: "#fafafa" }}>
        <div style={{ ...containerStyle, padding: "20px 16px" }}>
          <h1 style={{ textAlign: "center", fontSize: 32, fontWeight: 700, margin: 0 }}>
            Маркетплейс
          </h1>

          <div className="productsGrid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(5, 1fr)",
              gap: 16,
              alignItems: "stretch",
              margin: "32px 0 0",
            }}
          >
            {productsSafe.slice(0, 4).map((p) => (
              <div key={p.id} style={{ position: "relative" }}>
                <button
                  className="heartBtn"
                  style={{
                    position: "absolute",
                    top: 12,
                    right: 12,
                    zIndex: 2,
                  }}
                  aria-label="Додати в обране"
                  title="Додати в обране"
                >
                  ♡
                </button>
                {p.is_discount && (
                  <span
                    className="discountPill"
                    style={{ position: 'absolute', top: 12, left: 12, zIndex: 2 }}
                  >
                    −Знижка
                  </span>
                )}
                <Link href={`/products/${p.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                  <div className="productCard"
                    style={{
                      background: "#fff",
                      borderRadius: 12,
                      padding: 16,
                      boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
                      display: "flex",
                      flexDirection: "column",
                      minHeight: 380,
                    }}
                  >
                    <div className="imgWrap" style={{ width: '100%', height: 200, marginBottom: 12, borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
                      <Image
                        src={imgSrc(p.image)}
                        alt={p.name || 'product'}
                        width={600}
                        height={200}
                        style={{ width: '100%', height: '100%', objectFit: 'contain', transition: 'transform .25s ease' }}
                      />
                    </div>

                    <h3 style={{ margin: "12px 0", fontSize: 18 }}>{p.name}</h3>
                    <p className="productDesc" style={{ fontSize: 14, color: "#555" }}>{p.description}</p>

                    <div className="price" style={{ margin: '12px 0', display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      {p.is_discount && Number(p.old_price) > 0 && (
                        <span className="oldPrice" style={{ textDecoration: 'line-through', opacity: .6 }}>
                          {fmtUA(p.old_price)} ₴
                        </span>
                      )}
                      <span className="newPrice" style={{ fontWeight: 800 }}>
                        {fmtUA(p.price)} ₴
                      </span>
                    </div>
                    <button className="btnPrimary" style={{ marginTop: 'auto' }}>В корзину</button>
                  </div>
                </Link>
              </div>
            ))}
            <Link href="/products" key="view-all">
              <div
                className="viewAllTile"
                style={{
                  background: "#3b70f6",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  cursor: "pointer",
                  color: "#fff",
                  fontSize: 18,
                  fontWeight: 700,
                  minHeight: 380,
                  boxShadow: "0 2px 10px rgba(0,0,0,0.06)",
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
        </div>
      </main>
      {/* Популярні категорії */}
      <section style={{ ...containerStyle, margin: "20px auto", padding: "0 16px" }}>
        <h2 style={{ fontSize: "24px", fontWeight: 700, marginBottom: "16px" }}>
          Популярні категорії
        </h2>
        <div className="popularGrid"
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1fr 1fr 1fr",
            gridTemplateRows: "150px 150px",
            gap: 12,
          }}
        >
          {popularCategories.map((cat, idx) => (
            <div className="popularItem"
              key={idx}
              style={{
                gridColumn: cat.gridColumn,
                gridRow: cat.gridRow,
                height: 150,
                position: "relative",
                overflow: "hidden",
                borderRadius: 16,
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
      
      <style>{`
        /* Base tweaks */
        html, body { overflow-x: hidden; }

        /* Banners */
        .bannersGrid { align-items: stretch; }
        @media (max-width: 1024px) {
          .bannersGrid { grid-template-columns: 1fr !important; gap: 12px !important; }
          .banner { height: 240px !important; }
        }
        @media (max-width: 640px) {
          .banner { height: 180px !important; }
        }

        /* Products grid */
        @media (max-width: 1280px) {
          .productsGrid { grid-template-columns: repeat(4, 1fr) !important; }
        }
        @media (max-width: 1024px) {
          .productsGrid { grid-template-columns: repeat(3, 1fr) !important; }
        }
        @media (max-width: 768px) {
          .productsGrid { grid-template-columns: repeat(2, 1fr) !important; }
        }
        @media (max-width: 480px) {
          .productsGrid { grid-template-columns: 1fr !important; }
          .productsGrid a { width: 100%; }
        }

        /* Product card sizing */
        @media (max-width: 768px) {
          .productCard { min-height: 340px !important; }
        }
        @media (max-width: 480px) {
          .productCard { min-height: 300px !important; padding: 12px !important; }
          .productDesc { display: none !important; }
        }

        /* Popular categories grid (bottom section) */
        @media (max-width: 1024px) {
          .popularGrid { grid-template-columns: repeat(3, 1fr) !important; grid-template-rows: auto !important; }
          .popularItem { height: 140px !important; }
        }
        @media (max-width: 768px) {
          .popularGrid { grid-template-columns: repeat(2, 1fr) !important; }
          .popularItem { height: 130px !important; }
        }
        @media (max-width: 480px) {
          .popularGrid { grid-template-columns: 1fr !important; }
          .popularItem { height: 120px !important; }
        }

        /* Category chips: center on small screens */
        @media (max-width: 640px) {
          [data-cat-list] { justify-content: center; }
        }
        /* ===== Polish / Beauty pass ===== */
        :root {
          --brand: #3b70f6;
          --brand-600: #315ee0;
          --brand-700: #294fc2;
          --text: #0f172a;
          --muted: #6b7280;
          --card-shadow: 0 2px 10px rgba(0,0,0,0.06);
          --card-shadow-hover: 0 10px 24px rgba(0,0,0,0.12);
        }

        .productCard { transition: box-shadow .25s ease, transform .15s ease; }
        .productCard:hover { box-shadow: var(--card-shadow-hover); transform: translateY(-2px); }

        .imgWrap img { transition: transform .25s ease; }
        .productCard:hover .imgWrap img { transform: scale(1.03); }

        .heartBtn {
          width: 40px; height: 40px; border-radius: 9999px;
          background: rgba(255,255,255,.95);
          border: 1px solid rgba(0,0,0,.06);
          box-shadow: 0 4px 14px rgba(0,0,0,.12);
          font-size: 18px; line-height: 1; cursor: pointer;
          display: inline-grid; place-items: center;
          transition: transform .12s ease, box-shadow .2s ease;
        }
        .heartBtn:hover { transform: scale(1.06); box-shadow: 0 6px 18px rgba(0,0,0,.16); }

        .discountPill {
          background: #ef4444; color: #fff; font-weight: 800; font-size: 12px;
          padding: 6px 10px; border-radius: 9999px; box-shadow: 0 2px 10px rgba(239,68,68,.35);
        }

        .price .newPrice { color: var(--text); }
        .price .oldPrice { color: var(--muted); }

        .btnPrimary {
          appearance: none; border: none; cursor: pointer;
          width: 100%; padding: 12px 14px; border-radius: 10px;
          color: #fff; font-weight: 700; letter-spacing: .2px;
          background: linear-gradient(180deg, var(--brand) 0%, var(--brand-600) 100%);
          box-shadow: 0 6px 14px rgba(59,112,246,.28), inset 0 -2px 0 rgba(0,0,0,.15);
          transition: transform .06s ease, box-shadow .2s ease, filter .2s ease;
        }
        .btnPrimary:hover { filter: brightness(1.02); box-shadow: 0 10px 24px rgba(59,112,246,.32), inset 0 -2px 0 rgba(0,0,0,.15); }
        .btnPrimary:active { transform: translateY(1px); }

        .viewAllTile { transition: transform .12s ease, box-shadow .25s ease; }
        .viewAllTile:hover { transform: translateY(-2px); box-shadow: var(--card-shadow-hover); }

        /* Category chips hover/active polish */
        [data-cat-list] button { transition: transform .08s ease, box-shadow .2s ease; }
        [data-cat-list] button:hover { transform: translateY(-1px); box-shadow: 0 6px 14px rgba(59,112,246,.18); }
      `}</style>
    </>
  );
}