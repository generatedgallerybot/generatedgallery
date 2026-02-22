import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'GeneratedGallery.com - Free AI Art Gallery',
  description: 'Discover, search, and download amazing AI-generated art from across the internet. Browse thousands of images created by the best AI models.',
  keywords: 'AI art, generated images, artificial intelligence, AI gallery, free images, AI models',
  authors: [{ name: 'GeneratedGallery' }],
  openGraph: {
    title: 'GeneratedGallery.com - Free AI Art Gallery',
    description: 'Discover, search, and download amazing AI-generated art from across the internet.',
    url: 'https://generatedgallery.com',
    siteName: 'GeneratedGallery',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'GeneratedGallery.com - Free AI Art Gallery',
    description: 'Discover, search, and download amazing AI-generated art from across the internet.',
    images: ['/og-image.png'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}