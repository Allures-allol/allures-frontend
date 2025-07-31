'use client';

import styles from './header.module.css';
import { FaSearch, FaHeart, FaShoppingBag, FaUser, FaBars } from 'react-icons/fa';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

type Category = {
  category_id: number;
  name: string;
  description: string;
};

type Product = {
  category_id: number;
  // остальные поля можно добавить при необходимости
};

export default function Header() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Example: check for an auth token in localStorage
    const token = localStorage.getItem('authToken');
    setIsAuthenticated(!!token);
  }, []);

  const handleUserClick = () => {
    if (isAuthenticated) {
      router.push('/profile');
    } else {
      router.push('/auth');
    }
  };

  useEffect(() => {
    const fetchCategoriesFromProducts = async () => {
      try {
        const res = await fetch('https://api.alluresallol.com/products');
        const rawData = await res.json();

        // 👇 Явно приводим к массиву продуктов
        const products = rawData as Product[];

        const uniqueCategoryIds = Array.from(
          new Set(products.map((p) => p.category_id).filter(Boolean))
        );

        const categoryRequests: Promise<Category>[] = uniqueCategoryIds.map((id) =>
          fetch(`https://api.alluresallol.com/products/categories/${id}`).then((res) =>
            res.json()
          )
        );

        const resolvedCategories = await Promise.all(categoryRequests);
        setCategories(resolvedCategories);
      } catch (err) {
        console.error('Не вдалося отримати категорії:', err);
        setCategories([]);
      }
    };

    fetchCategoriesFromProducts();
  }, []);

  return (
    <header className={styles.header}>
      <div className={styles.topBar}>
        <div className={styles.leftLinks}>
          <span>📍 Київ</span>
          <a href="#">Про нас</a>
          <a href="#" className={styles.activeLink}>Акції</a>
          <a href="#">Новини</a>
          <a href="#">Служба підтримки</a>
        </div>
        <div className={styles.phoneNumber}>(044) 202 22 00</div>
      </div>

      <div className={styles.middleBar}>
        <div className={styles.logo}>AИ</div>

        <div className={styles.searchBlock}>
          <input type="text" placeholder="Шукати товари..." />
          <button><FaSearch /></button>
        </div>

        <div className={styles.iconBlock}>
          <FaHeart />
          <FaShoppingBag />
          <FaUser
            onClick={handleUserClick}
            style={{ cursor: 'pointer' }}
          />
        </div>
      </div>

      <div
        className={styles.catalogBar}
        onClick={() => setShowDropdown(!showDropdown)}
      >
        <div className={styles.catalogContent}>
          <FaBars className={styles.catalogIcon} />
          <span className={styles.catalogText}>Каталог товарів</span>
        </div>
      </div>

      {showDropdown && categories.length > 0 && (
        <div className={styles.dropdown}>
          {categories.map((cat) => (
            <a
              key={cat.category_id}
              href={`/category/${cat.category_id}`}
              className={styles.dropdownItem}
            >
              📦 {cat.name}
            </a>
          ))}
        </div>
      )}
    </header>
  );
}