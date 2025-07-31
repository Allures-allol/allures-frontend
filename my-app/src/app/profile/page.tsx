"use client";
import React, { useState } from "react";
import styles from "./profile.module.css";
import Image from "next/image";
import Header from "../../components/headers/header";
import Footer from "../../components/footers/footer";

export default function ProfilePage() {
  const [activeSection, setActiveSection] = useState("Контактна інформація");

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
          <nav className={styles.menu}>
            <ul className={styles.menuList}>
              <li
                className={`${styles.menuListItem} ${activeSection === "Контактна інформація" ? styles.activeMenuItem : ""}`}
                onClick={() => setActiveSection("Контактна інформація")}
              >
                Контактна інформація
              </li>
              <li
                className={`${styles.menuListItem} ${activeSection === "Адресна книга" ? styles.activeMenuItem : ""}`}
                onClick={() => setActiveSection("Адресна книга")}
              >
                Адресна книга
              </li>
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
                <input type="text" placeholder="Ваше ім'я" className={styles.formInput} />
              </div>
              <div className={styles.formGroup}>
                <input type="text" placeholder="Прізвище" className={styles.formInput} />
              </div>
              <div className={styles.formGroup}>
                <input type="email" placeholder="E-mail" className={styles.formInput} />
              </div>
              <div className={styles.formGroup}>
                <input type="date" placeholder="Дата народження" className={styles.formInput} />
              </div>
              <div className={styles.formGroup}>
                <input type="tel" placeholder="Телефон" className={styles.formInput} />
              </div>
              <button className={styles.saveBtn}>Зберегти</button>
              <div className={styles.orSeparator}>або</div>
              <button className={styles.googleBtn}>Продовжити з Google</button>
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
              <div className={styles.orderCard}>
                <p className={styles.noOrdersText}>нету покупок</p>
              </div>
            </>
          )}

          {/* Wishlist */}
          {activeSection === "Список бажань" && (
            <div className={styles.orderCard}>
              <p className={styles.noOrdersText}>вы еще не добавили товар в желаемые</p>
            </div>
          )}

          {/* Cart */}
          {activeSection === "Кошик" && (
            <div className={styles.cartCard}>
              <p className={styles.cartEmptyText}>Тут пусто</p>
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
        </div>
      </div>
      <Footer />
    </>
  );
}