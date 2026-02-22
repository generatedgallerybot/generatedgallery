import type { Metadata } from 'next';
import { Space_Grotesk, DM_Sans } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Generated Gallery — AI Art, Curated',
  description: 'Browse, search, and download thousands of AI-generated images. Free, open, no account needed.',
  keywords: 'AI art, AI images, generated images, stable diffusion, flux, midjourney, free AI art',
  authors: [{ name: 'Generated Gallery' }],
  openGraph: {
    title: 'Generated Gallery — AI Art, Curated',
    description: 'Browse, search, and download thousands of AI-generated images. Free and open.',
    url: 'https://generatedgallery.com',
    siteName: 'Generated Gallery',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Generated Gallery — AI Art, Curated',
    description: 'Browse, search, and download thousands of AI-generated images.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable}`}>
      <body className="font-body bg-surface-0 text-white antialiased">
        <Navbar />
        <main className="min-h-screen">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
