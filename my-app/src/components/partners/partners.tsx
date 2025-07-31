

import React from 'react';
import styles from './partners.module.css';

const logos = [
  'https://upload.wikimedia.org/wikipedia/commons/thumb/3/3a/Philips_logo.svg/2560px-Philips_logo.svg.png',
  'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg',
  'https://upload.wikimedia.org/wikipedia/commons/2/2c/HP_logo_2012.svg',
  'https://upload.wikimedia.org/wikipedia/commons/e/e7/L%27Oreal_Logo.svg',
  'https://upload.wikimedia.org/wikipedia/commons/2/2e/Dyson_logo.svg',
  'https://upload.wikimedia.org/wikipedia/commons/5/5b/Johnsons_Baby_logo.png',
  'https://upload.wikimedia.org/wikipedia/commons/0/0c/Lacoste_logo.svg',
  'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg',
  'https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg',
  'https://upload.wikimedia.org/wikipedia/commons/9/98/ASUS_Logo.svg',
];

export default function Partners() {
  return (
    <section className={styles.partnersSection}>
      <h2 className={styles.partnersTitle}>Компанії з якими ми співпрацюємо</h2>
      <div className={styles.partnersGrid}>
        {logos.map((src, idx) => (
          <div key={idx} className={styles.partnerLogo}>
            <img src={src} alt={`Partner logo ${idx}`} />
          </div>
        ))}
      </div>
    </section>
  );
}