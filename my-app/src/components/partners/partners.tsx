import React from 'react';
import Image from 'next/image';
import styles from './partners.module.css';

const logos = [
  '/philips.png',
  '/nike.png',
  '/hp.png',
  '/lyroche.png',
  '/dyson.png',
  '/baby.png',
  '/lacoste.png',
  '/apple.png',
  '/adidas.png',
  '/asus.png',
];

export default function Partners() {
  return (
    <section className={styles.partnersSection}>
      <h2 className={styles.partnersTitle}>Компанії з якими ми співпрацюємо</h2>
      <div className={styles.partnersGrid}>
        {logos.map((src) => (
          <div key={src} className={styles.partnerLogo}>
            <Image
              src={src}
              alt={src.replace(/^\//, '').replace(/\.[a-zA-Z0-9]+$/, '') + ' logo'}
              width={394}
              height={191}
              unoptimized
              priority={false}
              style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            />
          </div>
        ))}
      </div>
    </section>
  );
}