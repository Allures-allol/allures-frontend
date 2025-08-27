'use client';

import * as React from 'react';
import Link from 'next/link';
import Header from '@/components/headers/header';
import Footer from '@/components/footers/footer';
import './favorites.module.css';
type Product = {
  id: string | number;
  name: string;
  image: string;
  href?: string;
  price?: number;
};

type WishlistGroup = {
  id: string;           // стабильный id группы
  title: string;        // название группы
  items: Product[];     // товары в группе
};

const LS_KEY = 'wishlist:v1';

/** Набор данных по умолчанию — только для демонстрации. Потом можно будет подменить реальными товарами. */
const DEFAULT_GROUPS: WishlistGroup[] = [
  {
    id: 'tech',
    title: 'Техніка',
    items: [
      { id: 't1', name: 'Планшет', image: 'https://via.placeholder.com/96x96?text=Tab', href: '/products/1' },
      { id: 't2', name: 'Ноутбук', image: 'https://via.placeholder.com/96x96?text=Laptop', href: '/products/2' },
      { id: 't3', name: 'Ноутбук', image: 'https://via.placeholder.com/96x96?text=Laptop', href: '/products/3' },
      { id: 't4', name: 'Ноутбук', image: 'https://via.placeholder.com/96x96?text=Laptop', href: '/products/4' },
    ],
  },
  {
    id: 'beauty',
    title: 'Тіло та обличчя',
    items: [
      { id: 'b1', name: 'Сироватка', image: 'https://via.placeholder.com/96x96?text=Serum', href: '/products/10' },
      { id: 'b2', name: 'Крем', image: 'https://via.placeholder.com/96x96?text=Cream', href: '/products/11' },
      { id: 'b3', name: 'Олійка', image: 'https://via.placeholder.com/96x96?text=Oil', href: '/products/12' },
      { id: 'b4', name: 'Лосьйон', image: 'https://via.placeholder.com/96x96?text=Lotion', href: '/products/13' },
    ],
  },
];

/** Безопасно читаем/пишем localStorage */
function loadFromLS(): WishlistGroup[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed as WishlistGroup[];
  } catch {
    return null;
  }
}
function saveToLS(groups: WishlistGroup[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(LS_KEY, JSON.stringify(groups));
  } catch {}
}

export default function FavoritesPage() {
  const [groups, setGroups] = React.useState<WishlistGroup[]>([]);

  // Инициализация из localStorage или дефолтных данных
  React.useEffect(() => {
    const fromLS = loadFromLS();
    setGroups(fromLS && fromLS.length ? fromLS : DEFAULT_GROUPS);
  }, []);

  // Сохраняем при любых изменениях
  React.useEffect(() => {
    if (groups.length) saveToLS(groups);
  }, [groups]);

  // --- Группы ---
  const addGroup = () => {
    const title = prompt('Назва нової колекції (групи):', 'Нова колекція');
    if (!title) return;
    setGroups((prev) => [
      ...prev,
      { id: `group_${Date.now()}`, title: title.trim(), items: [] },
    ]);
  };

  const renameGroup = (id: string) => {
    const g = groups.find((x) => x.id === id);
    const next = prompt('Нова назва колекції:', g?.title || '');
    if (next == null) return;
    setGroups((prev) => prev.map((x) => (x.id === id ? { ...x, title: next.trim() || x.title } : x)));
  };

  const clearGroup = (id: string) => {
    if (!confirm('Очистити всі товари у цій колекції?')) return;
    setGroups((prev) => prev.map((x) => (x.id === id ? { ...x, items: [] } : x)));
  };

  const deleteGroup = (id: string) => {
    if (!confirm('Видалити колекцію?')) return;
    setGroups((prev) => prev.filter((x) => x.id !== id));
  };

  const shareGroup = async (id: string) => {
    const g = groups.find((x) => x.id === id);
    if (!g) return;
    const payload = {
      title: g.title,
      items: g.items.map((i) => ({ id: i.id, name: i.name, href: i.href })),
    };
    const text = `Мій список бажань — ${g.title}\n${payload.items
      .map((i) => `• ${i.name}${i.href ? ` — ${location.origin}${i.href}` : ''}`)
      .join('\n')}`;
    try {
      await navigator.clipboard.writeText(text);
      alert('Посилання/список скопійовано у буфер обміну ✅');
    } catch {
      alert(text); // fallback
    }
  };

  // --- Товары в группе ---
  const removeItem = (groupId: string, productId: string | number) => {
    setGroups((prev) =>
      prev.map((g) => (g.id === groupId ? { ...g, items: g.items.filter((p) => p.id !== productId) } : g))
    );
  };

  const addItem = (groupId: string, product: Product) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? { ...g, items: g.items.some((p) => p.id === product.id) ? g.items : [...g.items, product] }
          : g
      )
    );
  };

  return (
    <>
      <Header />
      <main className="wishlist">
        <header className="wishlist__header">
          <h1 className="wishlist__title">Список бажань</h1>
          <div className="wishlist__toolbar">
            <button className="wishlist__add" onClick={addGroup} aria-label="Додати колекцію">
              ＋
            </button>
          </div>
        </header>

        <section className="wishlist__groups">
          {groups.map((group) => (
            <div key={group.id} className="wishlist-group">
              <div className="wishlist-group__header">
                <button
                  className="wishlist-group__title"
                  onClick={() => renameGroup(group.id)}
                  title="Перейменувати"
                >
                  {group.title}
                </button>

                <div className="wishlist-group__actions">
                  <button
                    className="wishlist-group__share"
                    onClick={() => shareGroup(group.id)}
                    aria-label="Поділитися колекцією"
                    title="Поділитися"
                  >
                    ↗
                  </button>

                  <details className="wishlist-group__menu">
                    <summary aria-label="Меню">⋯</summary>
                    <div className="wishlist-group__menu-list">
                      <button onClick={() => renameGroup(group.id)}>Перейменувати</button>
                      <button onClick={() => clearGroup(group.id)}>Очистити</button>
                      <button onClick={() => deleteGroup(group.id)}>Видалити</button>
                    </div>
                  </details>
                </div>
              </div>

              <ul className="wishlist-group__list" aria-label={group.title}>
                {group.items.length === 0 ? (
                  <li className="wishlist-item wishlist-item--empty">Тут поки що немає товарів</li>
                ) : (
                  group.items.map((item) => (
                    <li key={item.id} className="wishlist-item">
                      <div className="wishlist-item__card">
                        <button
                          className="wishlist-item__remove"
                          aria-label="Видалити з колекції"
                          title="Видалити"
                          onClick={() => removeItem(group.id, item.id)}
                        >
                          ✕
                        </button>

                        {item.href ? (
                          <Link href={item.href} className="wishlist-item__link" aria-label={item.name}>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={item.image}
                              alt={item.name}
                              className="wishlist-item__image"
                              width={96}
                              height={96}
                            />
                            <span className="wishlist-item__name">{item.name}</span>
                          </Link>
                        ) : (
                          <div className="wishlist-item__link" aria-label={item.name}>
                            <img
                              src={item.image}
                              alt={item.name}
                              className="wishlist-item__image"
                              width={96}
                              height={96}
                            />
                            <span className="wishlist-item__name">{item.name}</span>
                          </div>
                        )}
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          ))}
        </section>
      </main>
      <Footer />
    </>
  );
}
