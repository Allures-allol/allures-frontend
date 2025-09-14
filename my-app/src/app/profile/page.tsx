"use client";
import React, { useState, useEffect } from "react";
import styles from "./profile.module.css";
import Image from "next/image";
import Header from "../../components/headers/header";
import Footer from "../../components/footers/footer";

export default function ProfilePage() {
  const [activeSection, setActiveSection] = useState("Контактна інформація");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);

  // ---- Read Allures JWT from localStorage
  const getStoredAlluresToken = (): string | null => {
    if (typeof window === 'undefined') return null;
    const keys = ['allures_jwt', 'alluresJwt', 'authToken', 'token', 'jwt'];
    for (const k of keys) {
      const v = localStorage.getItem(k);
      if (v && String(v).trim()) return String(v).trim();
    }
    // Fallback: find any JWT-looking value
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i) as string;
        const val = localStorage.getItem(key) || '';
        if (/\b[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\b/.test(val)) return val.trim();
      }
    } catch {}
    return null;
  };

  // ---- Normalize API user payload to UI fields
  const pickUserFields = (u: any) => {
    const emailVal = u?.email ?? u?.mail ?? u?.username ?? '';
    const phoneVal = u?.phone ?? u?.phone_number ?? u?.tel ?? u?.mobile ?? '';
    const first = u?.first_name ?? u?.firstName ?? u?.given_name ?? '';
    const last  = u?.last_name  ?? u?.lastName  ?? u?.family_name ?? '';
    const nameFromParts = `${String(first || '').trim()} ${String(last || '').trim()}`.trim();
    const full = u?.full_name ?? u?.fullName ?? u?.name ?? nameFromParts;
    return {
      fullName: String(full || '').trim(),
      email:   String(emailVal || '').trim(),
      phone:   String(phoneVal || '').trim(),
    };
  };

  // ---- Fetch /auth/me with token and fill the contact form
  const fetchProfileFromToken = async () => {
    const token = getStoredAlluresToken();
    if (!token) return;

    const ME_URL = 'https://api.alluresallol.com/auth/me';
    const attempts: Array<{ method: string; headers: Record<string, string> }> = [
      { method: 'GET', headers: { Accept: 'application/json', Authorization: `Bearer ${token}` } },
      { method: 'GET', headers: { Accept: 'application/json', Authorization: `JWT ${token}` } },
      { method: 'GET', headers: { Accept: 'application/json', Authorization: `Token ${token}` } },
    ];

    for (const a of attempts) {
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 12000);
        const res = await fetch(ME_URL, { method: a.method, headers: a.headers, cache: 'no-store', signal: ctrl.signal });
        clearTimeout(t);
        if (!res.ok) continue;
        const data = await res.json().catch(() => null);
        const user = data?.user ?? data ?? null;
        if (user) {
          const picked = pickUserFields(user);
          if (picked.fullName) setFullName(picked.fullName);
          if (picked.email)   setEmail(picked.email);
          if (picked.phone)   setPhone(picked.phone);
          return; // success
        }
      } catch {}
    }
  };

  // Run once on mount to prefill contact info
  useEffect(() => {
    (async () => {
      await fetchProfileFromToken(); // fill from API if available
      loadContactFromLocalStorage(); // override with user's saved edits
    })();
  }, []);

  const [cart, setCart] = useState<any[]>([]);
  const [wishlist, setWishlist] = useState<any[]>([]);

  // Read orders_history_v1 strictly from localStorage — disabled per request
  const getOrdersHistoryV1 = (): any[] => {
    return [];
  };

  // Read last_purchase_v1 snapshot from localStorage and adapt to UI order shape
  const getLastPurchaseV1 = (): any[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('last_purchase_v1');
      if (!raw) return [];
      const v = JSON.parse(raw);
      if (!v) return [];
      const items = Array.isArray(v.items) ? v.items : [];
      return [{
        orderId: v.orderId ?? v.id ?? 'last',
        createdAt: v.createdAt ?? v.date ?? v.timestamp ?? new Date().toISOString(),
        orderTotal: typeof v.total === 'number' ? v.total : (typeof v.orderTotal === 'number' ? v.orderTotal : null),
        items,
      }];
    } catch {}
    return [];
  };

  // Read cart from localStorage (allures_cart_v1) and normalize to an array of items
  const getCartV1 = (): any[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('allures_cart_v1');
      if (!raw) return [];
      const v = JSON.parse(raw);
      if (Array.isArray(v)) return v;
      if (v && Array.isArray(v.items)) return v.items;
      if (v && Array.isArray(v.cart)) return v.cart;
      if (v && typeof v === 'object') return Object.values(v as any).filter(Boolean);
    } catch {}
    return [];
  };

  // Read wishlist from localStorage (allures_wishlist_v1)
  const getWishlistV1 = (): any[] => {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem('allures_wishlist_v1');
      if (!raw) return [];
      const v = JSON.parse(raw);
      if (Array.isArray(v)) return v;
      if (v && Array.isArray(v.items)) return v.items;
      if (v && typeof v === 'object') return Object.values(v as any).filter(Boolean);
    } catch {}
    return [];
  };

  const writeWishlistV1 = (arr: any[]) => {
    try {
      localStorage.setItem('allures_wishlist_v1', JSON.stringify(arr));
      // notify other tabs/components
      window.dispatchEvent(new Event('wishlist:changed'));
    } catch {}
  };

  const removeFromWishlist = (pid: number | string) => {
    try {
      const current = getWishlistV1();
      const next = current.filter((x: any) => String(x?.id ?? x?.productId) !== String(pid));
      writeWishlistV1(next);
      setWishlist(next);
    } catch (e) {
      console.error('removeFromWishlist error:', e);
    }
  };

  // ---- Local contact storage keys
  const CONTACT_FULLNAME_KEY = 'profile_full_name_v1';
  const CONTACT_PHONE_KEY = 'profile_phone_v1';
  const CONTACT_EMAIL_KEY = 'profile_email_v1';

  const loadContactFromLocalStorage = () => {
    if (typeof window === 'undefined') return;
    try {
      const fn = localStorage.getItem(CONTACT_FULLNAME_KEY);
      const ph = localStorage.getItem(CONTACT_PHONE_KEY);
      const em = localStorage.getItem(CONTACT_EMAIL_KEY);
      if (fn && fn.trim()) setFullName(fn.trim());
      if (ph && ph.trim()) setPhone(ph.trim());
      if (em && em.trim()) setEmail(em.trim());
    } catch {}
  };

  const saveContactToLocalStorage = (next?: { fullName?: string; phone?: string; email?: string }) => {
    if (typeof window === 'undefined') return;
    try {
      const f = next?.fullName ?? fullName;
      const p = next?.phone ?? phone;
      const e = next?.email ?? email;
      if (f != null) localStorage.setItem(CONTACT_FULLNAME_KEY, String(f));
      if (p != null) localStorage.setItem(CONTACT_PHONE_KEY, String(p));
      if (e != null) localStorage.setItem(CONTACT_EMAIL_KEY, String(e));
    } catch {}
  };

  useEffect(() => {
    const load = () => {
      const last = getLastPurchaseV1();
      setOrders(last);
      setCart(getCartV1());
      setWishlist(getWishlistV1());
    };
    load();
    const onStorage = (e: StorageEvent) => {
      if (!e || e.key === null || e.key === 'last_purchase_v1' || e.key === 'allures_cart_v1' || e.key === 'allures_wishlist_v1') {
        load();
      }
      if (e && (e.key === CONTACT_FULLNAME_KEY || e.key === CONTACT_PHONE_KEY || e.key === CONTACT_EMAIL_KEY)) {
        loadContactFromLocalStorage();
      }
    };
    const onWishlist = () => {
      setWishlist(getWishlistV1());
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener('wishlist:changed', onWishlist as any);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener('wishlist:changed', onWishlist as any);
    };
  }, []);

  const adaptOrderForModal = (o: any) => {
    const orderId = o?.id ?? o?.order_id ?? o?.orderId ?? '';
    const when = o?.date || o?.created_at || o?.createdAt || o?.timestamp || null;
    const whenStr = when ? new Date(when).toLocaleString('uk-UA') : '';
    const itemsFromArray: any[] = Array.isArray(o?.items) ? o.items : (Array.isArray(o?.products) ? o.products : []);
    const hasLineEntry = !itemsFromArray.length && (o?.productName || o?.name);
    const singleItem = hasLineEntry ? [{
      id: o?.productId ?? o?.id ?? null,
      name: o?.productName ?? o?.name,
      qty: o?.quantity ?? o?.qty ?? 1,
      unitPrice: o?.unitPrice ?? o?.price ?? null,
      lineTotal: o?.totalPrice ?? (o?.unitPrice && o?.quantity ? Number(o.unitPrice) * Number(o.quantity) : null),
      image: o?.image ?? null,
    }] : [];
    const items: any[] = itemsFromArray.length ? itemsFromArray : singleItem;
    const totalRaw = (o?.orderTotal ?? o?.total ?? o?.amount ?? o?.sum ?? null);
    const totalStr = typeof totalRaw === 'number' ? `${Number(totalRaw).toFixed(2)} ₴` : (totalRaw ? String(totalRaw) : '—');
    return { orderId, whenStr, totalStr, items };
  };

  // Auto-save FIO and phone to localStorage on change
  useEffect(() => { saveContactToLocalStorage({ fullName }); }, [fullName]);
  useEffect(() => { saveContactToLocalStorage({ phone }); }, [phone]);

  return (
    <>
      <Header />
      <div className={styles.profileRoot}>
        <div className={styles.sidebar}>
          <div className={styles.userInfo}>
            <div className={styles.avatar}>
              <Image
                src="/avatar-placeholder.png"
                alt="User avatar"
                width={64}
                height={64}
                className={styles.avatarImg}
              />
            </div>
            <div>
              <div className={styles.userName}>{fullName && fullName.trim() ? fullName : "Ім'я Прізвище"}</div>
              <div className={styles.userEmail}>{email && email.trim() ? email : "—"}</div>
            </div>
          </div>
          <nav className={styles.menu}>
            <ul className={styles.menuList}>
              <li
                className={`${styles.menuListItem} ${activeSection === "Контактна інформація" ? styles.activeMenuItem : ""}`}
                onClick={() => setActiveSection("Контактна інформація")}
              >
                Контактна інформація
              </li>
              {/* <li
                className={`${styles.menuListItem} ${activeSection === "Адресна книга" ? styles.activeMenuItem : ""}`}
                onClick={() => setActiveSection("Адресна книга")}
              >
                Адресна книга
              </li> */}
              <li
                className={`${styles.menuListItem} ${activeSection === "Історія замовлень" ? styles.activeMenuItem : ""}`}
                onClick={() => setActiveSection("Історія замовлень")}
              >
                Історія замовлень
              </li>
              <li
                className={`${styles.menuListItem} ${activeSection === "Список бажань" ? styles.activeMenuItem : ""}`}
                onClick={() => setActiveSection("Список бажань")}
              >
                Список бажань
              </li>
              <li
                className={`${styles.menuListItem} ${activeSection === "Кошик" ? styles.activeMenuItem : ""}`}
                onClick={() => setActiveSection("Кошик")}
              >
                Кошик
              </li>
              <li
                className={`${styles.menuListItem} ${activeSection === "Знижки та акції" ? styles.activeMenuItem : ""}`}
                onClick={() => setActiveSection("Знижки та акції")}
              >
                Знижки та акції
              </li>
              <li className={styles.menuListItem}>Переглянуті товари</li>
              <li className={styles.menuListItem}>Кабінет продавця</li>
            </ul>
          </nav>
        </div>
        <div className={styles.content}>
          <h2 className={styles.sectionTitle}>{activeSection}</h2>
          {/* Contact Information */}
          {activeSection === "Контактна інформація" && (
            <div className={styles.contactForm}>
              <div className={styles.formGroup}>
                <input
                  type="text"
                  name="name"
                  autoComplete="name"
                  placeholder="Ім'я та прізвище"
                  className={styles.formInput}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  placeholder="E-mail"
                  className={styles.formInput}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <input
                  type="tel"
                  name="tel"
                  autoComplete="tel"
                  placeholder="Телефон"
                  className={styles.formInput}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>
              <button className={styles.saveBtn} onClick={() => saveContactToLocalStorage({ fullName, phone, email })}>Зберегти</button>
              {/* <div className={styles.orSeparator}>або</div> */}
              {/* <button className={styles.googleBtn}>Продовжити з Google</button> */}
            </div>
          )}

          {/* Address Book */}
          {activeSection === "Адресна книга" && (
            <div className={styles.contactForm}>
              <div className={styles.formGroup}>
                <input type="text" placeholder="Ім'я" className={styles.formInput} />
              </div>
              <div className={styles.formGroup}>
                <input type="text" placeholder="Прізвище" className={styles.formInput} />
              </div>
              <div className={styles.formGroup}>
                <input type="tel" placeholder="Телефон" className={styles.formInput} />
              </div>
              <div className={styles.formGroup}>
                <input type="text" placeholder="Вулиця" className={styles.formInput} />
              </div>
              <div className={styles.formRow}>
                <div className={styles.formGroup}>
                  <input type="text" placeholder="Будинок" className={styles.formInput} />
                </div>
                <div className={styles.formGroup}>
                  <input type="text" placeholder="Квартира" className={styles.formInput} />
                </div>
                <div className={styles.formGroup}>
                  <input type="text" placeholder="Індекс" className={styles.formInput} />
                </div>
              </div>
              <button className={styles.saveBtn}>Зберегти</button>
            </div>
          )}

          {/* Order History */}
          {activeSection === "Історія замовлень" && (
            <>
              <div className={styles.filters}>
                <button className={`${styles.filterButton} ${styles.filterButtonActive}`}>Всі</button>
                <button className={styles.filterButton}>Цього місяця</button>
                <button className={styles.filterButton}>Цього року</button>
                <button className={styles.filterButton}>Минулого року</button>
              </div>

              {orders && orders.length > 0 ? (
                orders.map((o, idx) => {
                  const orderId = o?.id ?? o?.order_id ?? o?.orderId ?? idx + 1;
                  const when = o?.date || o?.created_at || o?.createdAt || o?.timestamp || null;
                  const whenStr = when ? new Date(when).toLocaleString('uk-UA') : '';
                  const itemsFromArray: any[] = Array.isArray(o?.items) ? o.items : (Array.isArray(o?.products) ? o.products : []);
                  const hasLineEntry = !itemsFromArray.length && (o?.productName || o?.name);
                  const singleItem = hasLineEntry ? [{
                    name: o?.productName ?? o?.name,
                    qty: o?.quantity ?? o?.qty ?? 1,
                    unitPrice: o?.unitPrice ?? o?.price ?? null,
                    lineTotal: o?.totalPrice ?? (o?.unitPrice && o?.quantity ? Number(o.unitPrice) * Number(o.quantity) : null),
                  }] : [];
                  const items: any[] = itemsFromArray.length ? itemsFromArray : singleItem;
                  const totalRaw = (o?.orderTotal ?? o?.total ?? o?.amount ?? o?.sum ?? null);
                  const totalStr = typeof totalRaw === 'number' ? `${Number(totalRaw).toFixed(2)} ₴` : (totalRaw ? String(totalRaw) : '—');

                  return (
                    <div
                      className={styles.orderCard}
                      key={`order-${orderId}-${idx}`}
                      onClick={() => { setSelectedOrder(adaptOrderForModal(o)); setOrderModalOpen(true); }}
                      style={{ cursor: 'pointer' }}
                    >
                      <p><strong>Замовлення №{orderId}</strong>{whenStr ? ` — ${whenStr}` : ''}</p>
                      <p>Сума: {totalStr}</p>
                      {items.length > 0 ? (
                        <div>
                          <p><strong>Товари:</strong></p>
                          <ul style={{ margin: 0, paddingLeft: 18 }}>
                            {items.map((it: any, i: number) => {
                              const name = it?.name ?? it?.title ?? `Товар ${i + 1}`;
                              const qty = it?.qty ?? it?.quantity ?? 1;
                              return <li key={`item-${i}`}>{name}{qty ? ` × ${qty}` : ''}{(it?.unitPrice != null) ? ` — ${Number(it.unitPrice).toFixed(2)} ₴/шт` : ''}{(it?.lineTotal != null) ? ` = ${Number(it.lineTotal).toFixed(2)} ₴` : ''}</li>;
                            })}
                          </ul>
                        </div>
                      ) : (
                        <p>Перелік товарів відсутній</p>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className={styles.orderCard}>
                  <p className={styles.noOrdersText}>нету покупок</p>
                </div>
              )}
            </>
          )}

          {/* Wishlist */}
          {activeSection === "Список бажань" && (
            <div className={styles.cartCard}>
              {wishlist && wishlist.length > 0 ? (
                <div>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {wishlist.map((it: any, i: number) => {
                      const pid = it?.id ?? it?.productId ?? null;
                      const name = it?.name ?? it?.title ?? `Товар ${i + 1}`;
                      const price = Number(it?.price ?? it?.unitPrice ?? 0) || 0;
                      const old = it?.old_price != null ? Number(it.old_price) : null;
                      const img = it?.image ?? null;
                      return (
                        <li key={`witem-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #eee' }}>
                          {img ? (
                            <Image src={img} alt={name} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 6 }} />
                          ) : (
                            <div style={{ width: 48, height: 48, borderRadius: 6, background: '#f0f0f0' }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                            <div style={{ color: '#555' }}>
                              {old != null ? <><span style={{ textDecoration: 'line-through', opacity: 0.7 }}>{old.toFixed(2)} ₴</span>{' '}</> : null}
                              <span>{price.toFixed(2)} ₴</span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                            {pid ? (
                              <a href={`/products/${encodeURIComponent(String(pid))}`} style={{ textDecoration: 'none', fontWeight: 600 }}>
                                Перейти до товару →
                              </a>
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
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ) : (
                <p className={styles.cartEmptyText}>ви ще не додали товар у бажане</p>
              )}
            </div>
          )}

          {/* Cart */}
          {activeSection === "Кошик" && (
            <div className={styles.cartCard}>
              {cart && cart.length > 0 ? (
                <div>
                  {/* <h3 style={{ marginTop: 0 }}>Ваш кошик</h3> */}
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {cart.map((it: any, i: number) => {
                      const pid = it?.productId ?? it?.id ?? null;
                      const name = it?.name ?? it?.title ?? `Товар ${i + 1}`;
                      const qty = Number(it?.qty ?? it?.quantity ?? 1) || 1;
                      const unit = Number(it?.unitPrice ?? it?.price ?? 0) || 0;
                      const line = Number(it?.lineTotal ?? (unit * qty)) || 0;
                      const img = it?.image ?? null;
                      return (
                        <li key={`citem-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #eee' }}>
                          {img ? (
                            <Image src={img} alt={name} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 6 }} />
                          ) : (
                            <div style={{ width: 48, height: 48, borderRadius: 6, background: '#f0f0f0' }} />
                          )}
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                            <div style={{ color: '#555' }}>
                              × {qty} · {unit.toFixed(2)} ₴/шт · = {line.toFixed(2)} ₴
                            </div>
                          </div>
                          {pid ? (
                            <a href={`/products/${encodeURIComponent(String(pid))}`} style={{ textDecoration: 'none', fontWeight: 600 }}>
                              Перейти до товару →
                            </a>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 10, fontWeight: 700 }}>
                    {(() => {
                      const total = cart.reduce((s: number, it: any) => {
                        const qty = Number(it?.qty ?? it?.quantity ?? 1) || 1;
                        const unit = Number(it?.unitPrice ?? it?.price ?? 0) || 0;
                        return s + unit * qty;
                      }, 0);
                      return <div>Разом: {total.toFixed(2)} ₴</div>;
                    })()}
                  </div>
                </div>
              ) : (
                <p className={styles.cartEmptyText}>Тут пусто</p>
              )}
            </div>
          )}

          {/* Promotions */}
          {activeSection === "Знижки та акції" && (
            <div className={styles.promoGrid}>
              {[1, 2, 3, 4].map((idx) => (
                <div key={idx} className={styles.promoCard}>
                  {/* TODO: Replace src with your image in public folder */}
                  <img
                    src={`/promo${idx}.png`}
                    alt={`Promotion ${idx}`}
                    className={styles.promoImage}
                  />
                  <button className={styles.promoButton}>
                    {/* TODO: Update button text */}
                    Дізнатися більше
                  </button>
                </div>
              ))}
            </div>
          )}

          {orderModalOpen && selectedOrder && (
            <div
              onClick={() => setOrderModalOpen(false)}
              style={{
                position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                zIndex: 9999,
              }}
            >
              <div
                onClick={(e) => e.stopPropagation()}
                style={{
                  background: '#fff', borderRadius: 12, maxWidth: 720, width: '90%',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.2)', padding: 20,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <h3 style={{ margin: 0 }}>Замовлення №{selectedOrder.orderId}</h3>
                  <button onClick={() => setOrderModalOpen(false)} style={{ border: 'none', background: 'transparent', fontSize: 20, cursor: 'pointer' }}>×</button>
                </div>
                <p style={{ marginTop: 0, color: '#666' }}>{selectedOrder.whenStr}</p>
                <p><strong>Сума:</strong> {selectedOrder.totalStr}</p>

                {Array.isArray(selectedOrder.items) && selectedOrder.items.length > 0 ? (
                  <div style={{ marginTop: 10 }}>
                    <p style={{ margin: '8px 0' }}><strong>Товари:</strong></p>
                    <ul style={{ listStyle: 'none', paddingLeft: 0, margin: 0 }}>
                      {selectedOrder.items.map((it: any, i: number) => {
                        const name = it?.name ?? it?.title ?? `Товар ${i + 1}`;
                        const qty = it?.qty ?? it?.quantity ?? 1;
                        const unit = it?.unitPrice != null ? Number(it.unitPrice) : null;
                        const total = it?.lineTotal != null ? Number(it.lineTotal) : (unit != null ? unit * Number(qty) : null);
                        const pid = it?.productId ?? it?.id ?? null;
                        const img = it?.image ?? null;
                        return (
                          <li key={`mitem-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid #eee' }}>
                            {img ? (
                              <Image src={img} alt={name} width={48} height={48} style={{ objectFit: 'cover', borderRadius: 6 }} />
                            ) : (
                              <div style={{ width: 48, height: 48, borderRadius: 6, background: '#f0f0f0' }} />)
                            }
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{name}</div>
                              <div style={{ color: '#555' }}>
                                {qty ? `× ${qty}` : ''}
                                {unit != null ? ` · ${unit.toFixed(2)} ₴/шт` : ''}
                                {total != null ? ` · = ${total.toFixed(2)} ₴` : ''}
                              </div>
                            </div>
                            {pid ? (
                              <a href={`/products/${encodeURIComponent(String(pid))}`} style={{ textDecoration: 'none', fontWeight: 600 }}>
                                Перейти до товару →
                              </a>
                            ) : null}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : (
                  <p>Перелік товарів відсутній</p>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
                  <button onClick={() => setOrderModalOpen(false)} className={styles.saveBtn}>Закрити</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}