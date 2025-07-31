

import React from 'react';
import styles from './footer.module.css';

export default function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerColumns}>
        <div className={styles.footerColumn}>
          <h3>Allures</h3>
          <ul>
            <li><a href="#">Кар’єра</a></li>
            <li><a href="#">Для ЗМІ</a></li>
            <li><a href="#">Оптовим клієнтам</a></li>
            <li><a href="#">Служба підтримки</a></li>
            <li><a href="#">Про Компанію</a></li>
            <li><a href="#">Новини</a></li>
          </ul>
        </div>
        <div className={styles.footerColumn}>
          <h3>Клієнтам</h3>
          <ul>
            <li><a href="#">Публічні оферти</a></li>
            <li><a href="#">Акції, розіграші, призи</a></li>
            <li><a href="#">Інструкції та прошивки</a></li>
            <li><a href="#">Доставка</a></li>
            <li><a href="#">Оплата</a></li>
            <li><a href="#">Гарантійні умови</a></li>
          </ul>
        </div>
        <div className={styles.footerColumn}>
          <h3>Категорії</h3>
          <ul>
            <li><a href="#">Ноутбуки та комп’ютери</a></li>
            <li><a href="#">Смартфони, ТВ і електроніка</a></li>
            <li><a href="#">Товари для геймерів</a></li>
            <li><a href="#">Побутова техніка</a></li>
            <li><a href="#">Товари для дому</a></li>
            <li><a href="#">Інструменти та автотовари</a></li>
            <li><a href="#">Сантехніка та ремонт</a></li>
            <li><a href="#">Дача, сад, город</a></li>
            <li><a href="#">Спорт і захоплення</a></li>
          </ul>
        </div>
        <div className={styles.footerColumn}>
          <h3>Контакти</h3>
          <ul>
            <li><strong>044 202 22 00</strong><br/>Оформити замовлення 8:00 – 20:00</li>
            <li><strong>044 220 20 20</strong><br/>Служба підтримки 10:00 – 19:00</li>
          </ul>
        </div>
      </div>

      <div className={styles.footerApps}>
        <img src="/qrcode.png" alt="QR Code" />
        <img src="/appstore-badge.png" alt="Download on the App Store" />
        <img src="/googleplay-badge.png" alt="Get it on Google Play" />
      </div>

      <div className={styles.footerSocial}>
        <img src="/icons/facebook.svg" alt="Facebook" />
        <img src="/icons/instagram.svg" alt="Instagram" />
        <img src="/icons/tiktok.svg" alt="TikTok" />
        <img src="/icons/youtube.svg" alt="YouTube" />
      </div>

      <div className={styles.footerPayments}>
        <img src="/icons/gpay.svg" alt="Google Pay" />
        <img src="/icons/applepay.svg" alt="Apple Pay" />
        <img src="/icons/visa.svg" alt="Visa" />
        <img src="/icons/mastercard.svg" alt="Mastercard SecureCode" />
      </div>
    </footer>
  );
}