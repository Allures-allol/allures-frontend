"use client";
import React from "react";
import styles from "./profile.module.css";
import Image from "next/image";

function Header() {
  return (
    <header className={styles.header}>
      <div className={styles.headerLeft}>
        <button className={styles.menuBtn}>
          <span className={styles.menuIcon}>≡</span>
        </button>
        <button className={styles.catalogBtn}>
          <span className={styles.catalogIcon}>🗂️</span> Каталог
        </button>
        <Image
          src="/logo.png"
          alt="Allures"
          width={37}
          height={38}
          className={styles.logo}
        />
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Я шукаю…"
        />
      </div>
      <div className={styles.headerRight}>
        <button className={styles.voiceBtn} title="Голосовий пошук">
          <span role="img" aria-label="mic">🎤</span>
        </button>
        <button className={styles.findBtn}>Знайти</button>
        <div className={styles.headerIcons}>
          <span className={styles.headerIcon}>≡</span>
          <span className={styles.headerIcon}>👤</span>
          <span className={styles.headerIcon}>⚖️</span>
          <span className={styles.headerIcon}>♡</span>
          <span className={styles.headerIcon}>
            <Image src="/basket.png" alt="Basket" width={24} height={24} />
          </span>
        </div>
      </div>
    </header>
  );
}

export default function ProfilePage() {
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
              <div className={styles.userName}>Ім'я Прізвище</div>
              <div className={styles.userEmail}>name123@gmail.com</div>
            </div>
          </div>
          <div className={styles.menu}>
            <hr className={styles.menuDivider} />
            <div className={styles.menuSection}>
              <div className={styles.menuTitle}>Бонусний рахунок</div>
            </div>
            <hr className={styles.menuDivider} />
            <ul>
              <li>
                <span className={styles.menuIcon}>{/* иконка */}</span>
                Замовлення
              </li>
              <li>
                <span className={styles.menuIcon}>{/* <Image src="/chat.svg" ... /> */}</span>
                Листування з продавцями
              </li>
              <li>
                <span className={styles.menuIcon}>{/* <Image src="/bell.svg" ... /> */}</span>
                Персональні пропозиції
              </li>
              <li>
                <span className={styles.menuIcon}>{/* <Image src="/basket.svg" ... /> */}</span>
                Кошик
              </li>
              <li>
                <span className={styles.menuIcon}>{/* <Image src="/heart.svg" ... /> */}</span>
                Вподобайки <span className={styles.counter}>0</span>
              </li>
              <li>
                <span className={styles.menuIcon}>{/* <Image src="/compare.svg" ... /> */}</span>
                Списки порівнянь
              </li>
              <li>
                <span className={styles.menuIcon}>{/* <Image src="/review.svg" ... /> */}</span>
                Відгуки
              </li>
            </ul>
          </div>
        </div>
        <div className={styles.content}>
          <h2 className={styles.sectionTitle}>Особисті дані</h2>
          <div className={styles.profileCard}>
            <div className={styles.profileImageSection}>
              <Image
                src="/avatar-placeholder.png"
                alt="Profile"
                width={90}
                height={90}
                className={styles.profileImg}
              />
              <div>
                <button className={styles.updateBtn}>Оновити зображення профілю</button>
                <button className={styles.deleteBtn} title="Видалити">
                  <Image
                    src="/trash.png"
                    alt="Delete"
                    width={24}
                    height={24}
                    style={{ verticalAlign: "middle" }}
                  />
                </button>
                <div className={styles.imageHint}>
                  Має бути JPEG, PNG або GIF та не перевищувати 10 МБ.
                </div>
              </div>
            </div>
            <div className={styles.profileFields}>
              <div className={styles.profileField}>
                <div className={styles.fieldLabel}>Мій акаунт</div>
                <div>Ім'я Прізвище</div>
              </div>
              <div className={styles.profileField}>
                <div className={styles.fieldLabel}>Особисті дані</div>
                <div>Українська</div>
              </div>
              <div className={styles.profileField}>
                <div className={styles.fieldLabel}>Мої отримувачі замовлень</div>
              </div>
              <div className={styles.profileField}>
                <div className={styles.fieldLabel}>Контакти</div>
                <div>+39 093 342 53 33 name123@gmail.com</div>
              </div>
              <div className={styles.profileField}>
                <div className={styles.fieldLabel}>Адреса доставки</div>
              </div>
            </div>
          </div>
          <button className={styles.logoutBtn}>Вихід</button>
        </div>
      </div>
    </>
  );
}