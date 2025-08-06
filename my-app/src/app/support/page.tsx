

// src/app/support/page.tsx
import React from 'react'
import Header from '../../components/headers/header'
import Footer from '../../components/footers/footer'
import styles from './support.module.css'

export default function SupportPage() {
  return (
    <>
      <Header />
      {/* Breadcrumb */}
      <nav className={styles.breadcrumb}>
        <span>🏠</span>
        <span>/</span>
        <span>Служба підтримки</span>
      </nav>

      {/* Intro */}
      <main className={styles.main}>
        <section className={styles.intro}>
          <h1>Любї Клієнте!</h1>
          <h2>Вітаємо на сторінці Служби підтримки Allures!</h2>
          <p>
            Тут ви зможете вирішити будь-яке питання, отримати якісну консультацію,
            поділитись враженнями від покупки та/або запропонувати цікаві пропозиції до
            розгляду.
          </p>
          <p>
            Для нас дуже важлива думка кожного, адже ми прагнемо створювати максимально
            зручний сервіс для ваших покупок
          </p>
          <p>
            Ми будемо раді, якщо ви знайдете час поділитися своїми емоціями від покупок!
          </p>
          <p>
            Наша головна мета — підтримання сервісного обслуговування на найвищому рівні.
            Тому отриманий від вас зворотний зв'язок дуже важливий для нас
          </p>
        </section>

        {/* Call us */}
        <section className={styles.callSection}>
          <div className={styles.callBox}>
            <h3>Зателефонуйте нам</h3>
            <small>з 10:00 до 19:00</small>
            <p className={styles.phone}>044 220 20 20</p>
          </div>
        </section>

        {/* Write us */}
        <section className={styles.writeSection}>
          <div className={styles.writeBox}>
            <h3>Напишіть нам</h3>
            <small>з 8:00 до 20:00</small>
            <div className={styles.writeActions}>
              <a href="mailto:support@allures.com" className={styles.emailBtn}>
                support@allures.com
              </a>
              <button className={styles.ticketBtn}>Створити звернення</button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}