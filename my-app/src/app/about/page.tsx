import React from 'react';
import Header from '../../components/headers/header';
import Footer from '../../components/footers/footer';
import styles from './about.module.css';

export default function About() {
  return (
    <>
      <Header />

      {/* Breadcrumb */}
      <div className={styles.breadcrumb}>
        <span>🏠</span>
        <span className={styles.separator}>&gt;</span>
        <span>Про нас</span>
      </div>

      {/* Hero section */}
      <section className={styles.hero}>
        <img
          src="/about.png" 
          alt="Команда Allures" 
          className={styles.heroImage}
        />
        <div className={styles.heroTextBox}>
          <p>
            Allures — це сучасна цифрова платформа, яка об’єднує тисячі продавців
            та мільйони покупців в єдиному зручному просторі для торгівлі.
            Ми створили Allures з однією метою: зробити онлайн-покупки максимально простими,
            безпечними та вигідними для всіх учасників ринку.
          </p>
          <div className={styles.stats}>
            <div className={styles.stat}>
              <span className={styles.statValue}>98%</span>
              <span className={styles.statLabel}>Задоволених покупців</span>
            </div>
            <div className={styles.stat}>
              <span className={styles.statValue}>+900т</span>
              <span className={styles.statLabel}>Товарів у різних категоріях</span>
            </div>
          </div>
        </div>
      </section>

      {/* Intro paragraph */}
      <section className={styles.intro}>
        <p>
          Ми прагнемо створити найкращий досвід онлайн-торгівлі, де кожен покупець
          може знайти саме те, що шукає, а кожен продавець має можливість розвивати
          свій бізнес без обмежень.
        </p>
      </section>

      {/* Features grid */}
      <section className={styles.features}>
        <div className={styles.featureCard}>
          <img src="/about1.png" alt="Каталог" className={styles.featureIcon} />
          <p>Понад 10 тисяч перевірених продавців у десятках категорій</p>
        </div>
        <div className={styles.featureCard}>
          <img src="/about2.png" alt="Верифікація" className={styles.featureIcon} />
          <p>Ретельна верифікація продавців та гарантована якість товарів</p>
        </div>
        <div className={styles.featureCard}>
          <img src="/about3.png" alt="Безпека" className={styles.featureIcon} />
          <p>Сучасні технології шифрування та захищені платежі</p>
        </div>
        <div className={styles.featureCard}>
          <img src="/about4.png" alt="Логістика" className={styles.featureIcon} />
          <p>Найкраща мережа партнерів-логістів із доставкою у реальному часі</p>
        </div>
      </section>

      <Footer />
    </>
  );
}
