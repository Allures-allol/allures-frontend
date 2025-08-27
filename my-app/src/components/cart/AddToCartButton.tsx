

'use client';

import React, { useCallback } from 'react';
import { useRouter } from 'next/navigation';

export type CartItem = {
  id: number | string;
  name: string;
  price: number;
  image?: string | null;
  qty: number;
};

function normalizeImage(src?: string | null): string {
  if (!src) return '/placeholder.png';
  if (src.startsWith('http')) return src;
  return `https://api.alluresallol.com${src}`;
}

export function readCart(): CartItem[] {
  try {
    const raw = localStorage.getItem('cart_items');
    return raw ? (JSON.parse(raw) as CartItem[]) : [];
  } catch {
    return [];
  }
}

export function writeCart(items: CartItem[]) {
  localStorage.setItem('cart_items', JSON.stringify(items));
}

export function addToCart(item: Omit<CartItem, 'qty'>, qty = 1): CartItem[] {
  const items = readCart();
  const idStr = String(item.id);
  const idx = items.findIndex((it) => String(it.id) === idStr);
  if (idx >= 0) {
    items[idx].qty += qty;
  } else {
    items.push({ ...item, image: normalizeImage(item.image), qty });
  }
  writeCart(items);
  return items;
}

/**
 * Кнопка добавления товара в корзину. Работает только на клиенте.
 *
 * Пример использования:
 * <AddToCartButton id={p.id} name={p.name} price={p.price} image={p.image} goToCart>Купити</AddToCartButton>
 */
export default function AddToCartButton(
  {
    id,
    name,
    price,
    image,
    qty = 1,
    goToCart = false,
    onAdded,
    children,
    className,
    style,
    disabled,
    title,
  }: {
    id: number | string;
    name: string;
    price: number;
    image?: string | null;
    qty?: number; // сколько добавить за один клик
    goToCart?: boolean; // перейти на /cart после добавления
    onAdded?: (items: CartItem[]) => void; // колбек после добавления
    children?: React.ReactNode; // текст кнопки
    className?: string;
    style?: React.CSSProperties;
    disabled?: boolean;
    title?: string;
  }
) {
  const router = useRouter();

  const handleClick = useCallback(() => {
    const items = addToCart({ id, name, price, image }, qty);
    onAdded?.(items);
    if (goToCart) router.push('/cart');
  }, [goToCart, id, image, name, onAdded, price, qty, router]);

  return (
    <button
      type="button"
      onClick={handleClick}
      className={className}
      style={style}
      disabled={disabled}
      title={title}
    >
      {children ?? 'Додати в кошик'}
    </button>
  );
}