import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";


const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://alluresallol.com';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'ALLURES — інтернет‑магазин',
    template: '%s | ALLURES',
  },
  description: 'ALLURES — інтернет‑магазин. Новинки, знижки та швидка доставка.',
  icons: {
    icon: [
      { url: '/logo.png', type: 'image/png', sizes: 'any' },
    ],
    apple: [
      { url: '/logo.png', type: 'image/png' },
    ],
    shortcut: ['/logo.png'],
  },
  openGraph: {
    title: 'ALLURES — інтернет‑магазин',
    description: 'ALLURES — інтернет‑магазин. Новинки, знижки та швидка доставка.',
    siteName: 'ALLURES',
    type: 'website',
    url: SITE_URL,
    images: [
      { url: '/logo.png', width: 1200, height: 630, alt: 'ALLURES' },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ALLURES — інтернет‑магазин',
    description: 'ALLURES — інтернет‑магазин. Новинки, знижки та швидка доставка.',
    images: ['/logo.png'],
  },
  manifest: '/site.webmanifest',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <head>
        <link rel="icon" type="image/png" href="/logo.png" />
        <link rel="apple-touch-icon" href="/logo.png" />
        <link rel="shortcut icon" href="/logo.png" />
        <link rel="manifest" href="/site.webmanifest" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
