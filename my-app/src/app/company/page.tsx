

import Link from 'next/link';
import Header from '@/components/headers/header';
import Footer from '@/components/footers/footer';
import './company.module.css';
// Серверний компонент (без хукiв) — чиста розмітка, стилі підключимо окремо
export default function CompanyPage() {
  const plans = [
    {
      id: 'basic',
      ribbon: 'Зекономте 20% для нових замовлень',
      title: 'Allures Business',
      price: 6999,
      features: [
        'До 1 000 товарів',
        'Карти товарів',
        'Оформлення замовлень',
        'Доступ до SEO-опцій',
      ],
      popular: false,
    },
    {
      id: 'pro',
      ribbon: 'Зекономте 20% для нових замовлень',
      title: 'Allures Business+',
      price: 10499,
      features: [
        'До 5 000 товарів',
        'Розширені інструменти',
        'Пріоритетна підтримка',
        'Повний доступ до SEO-опцій',
      ],
      popular: true,
    },
    {
      id: 'max',
      ribbon: 'Зекономте 20% для нових замовлень',
      title: 'Allures Business pro',
      price: 12899,
      features: [
        'Необмежено товарів',
        'Інтеграції та API',
        'Командні доступи',
        'CEO/SEO-опції без обмежень',
      ],
      popular: false,
    },
  ];

  return (
    <>
      {/* Головний хедер сайту */}
      <Header />

      <main className="company">
        {/* Верхня службова смуга/крихти можна стилізувати пізніше */}
        <div className="company__bar">
          <nav className="company__breadcrumbs" aria-label="breadcrumbs">
            <Link href="/">На головну</Link>
            <span aria-hidden> / </span>
            <span>Allures Business</span>
          </nav>
        </div>

        <div className="company__layout">
          {/* Ліва навігація */}
          <aside className="company__sidebar" aria-label="Навігація бізнес-кабінету">
            <ul className="company-nav">
              <li className="company-nav__item company-nav__item--active"><Link href="#">Головна</Link></li>
              <li className="company-nav__item"><Link href="#">Товари</Link></li>
              <li className="company-nav__item"><Link href="#">Замовлення</Link></li>
              <li className="company-nav__item"><Link href="#">Баланс та виплати</Link></li>
              <li className="company-nav__item"><Link href="#">Просування</Link></li>
              <li className="company-nav__item"><Link href="#">Мій магазин</Link></li>
              <li className="company-nav__item"><Link href="#">Налаштування</Link></li>
              <li className="company-nav__item"><Link href="#">Клієнти та комунікація</Link></li>
            </ul>
          </aside>

          {/* Основний вміст */}
          <section className="company__content">
            <header className="company__hero">
              <h1 className="company__title">Раді вітати в Allures Business!</h1>
              <ol className="company__intro">
                <li>Придбайте річне розміщення, щоб почати роботу</li>
                <li>Додайте товари, та побачить мільйони покупців на Allures</li>
                <li>Продавайте на Allures та сплачуйте комісію лише за успішні замовлення</li>
              </ol>
            </header>

            {/* Крок 1 */}
            <section className="company-step" aria-labelledby="step1-title">
              <div className="company-step__head">
                <span className="company-step__index" aria-hidden>1</span>
                <h2 id="step1-title" className="company-step__title">Річне розміщення</h2>
              </div>

              <div className="plans">
                {plans.map((p) => (
                  <article key={p.id} className={`plan${p.popular ? ' plan--popular' : ''}`} aria-label={p.title}>
                    <div className="plan__ribbon">{p.ribbon}</div>
                    <header className="plan__header">
                      <h3 className="plan__title">{p.title}</h3>
                    </header>
                    <ul className="plan__features">
                      {p.features.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                    <div className="plan__price">
                      <span className="plan__amount">{p.price.toLocaleString('uk-UA')}</span>
                      <span className="plan__currency">₴</span>
                    </div>
                    <div className="plan__actions">
                      <button type="button" className="plan__buy" data-plan-id={p.id}>
                        Придбати
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            {/* Крок 2 */}
            <section className="company-step" aria-labelledby="step2-title">
              <div className="company-step__head">
                <span className="company-step__index" aria-hidden>2</span>
                <h2 id="step2-title" className="company-step__title">Додайте товари</h2>
              </div>

              <p className="company-step__desc">
                Після придбання тарифу ваші товари автоматично публікуються у каталозі
                Allures, якщо відповідають вимогам.
              </p>

              <div className="company-step__actions">
                <Link href="/admpanel/products/new" className="btn btn--primary">Додати</Link>
              </div>
            </section>
          </section>
        </div>
      </main>

      {/* Футер сайту */}
      <Footer />
    </>
  );
}