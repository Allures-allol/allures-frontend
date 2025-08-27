

import React from 'react';
import Header from '@/components/headers/header';
import Footer from '@/components/footers/footer';

export default function CartPage() {
  return (
    <>
      <Header />
      <main
        style={{
          maxWidth: 1200,
          margin: '24px auto',
          padding: '0 16px',
        }}
      >
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 16 }}>Кошик</h1>

        {/* Карточка пустой корзины */}
        <section
          aria-label="Порожній кошик"
          style={{
            background: '#fff',
            border: '1px solid #E6E6E6',
            borderRadius: 12,
            padding: 16,
            minHeight: 140,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#7a7a7a',
          }}
        >
          <span style={{ fontSize: 16 }}>тут будут ваши товари</span>
        </section>

        {/* Підсумок і кнопка оформлення */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: 16,
          }}
        >
          <div style={{ color: '#7a7a7a' }}>Підсумок</div>
          <div style={{ fontWeight: 700 }}>0 ₴</div>
        </div>

        <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
          <button
            type="button"
            disabled
            style={{
              padding: '12px 24px',
              borderRadius: 10,
              border: 'none',
              background: '#1a5eff',
              color: '#fff',
              fontWeight: 600,
              cursor: 'not-allowed',
              opacity: 0.6,
            }}
          >
            Замовити
          </button>
        </div>
      </main>
      <Footer />
    </>
  );
}