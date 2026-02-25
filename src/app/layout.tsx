import type { Metadata } from 'next';
import { Space_Grotesk, DM_Sans } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { ClientProviders } from '@/components/ClientProviders';

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
  metadataBase: new URL('https://generatedgallery.com'),
  title: {
    default: 'Generated Gallery — AI Art, Curated',
    template: '%s | Generated Gallery',
  },
  description: 'Browse, search, and download thousands of AI-generated images and prompts. Free, open, no account needed. Stable Diffusion, Flux, Midjourney and more.',
  keywords: ['AI art', 'AI images', 'AI generated images', 'stable diffusion', 'flux', 'midjourney', 'free AI art', 'AI art gallery', 'AI prompts', 'text to image', 'generated images', 'AI artwork'],
  authors: [{ name: 'Generated Gallery' }],
  creator: 'Generated Gallery',
  publisher: 'Generated Gallery',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '32x32' },
      { url: '/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
      { url: '/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180' }],
  },
  manifest: '/site.webmanifest',
  openGraph: {
    title: 'Generated Gallery — AI Art, Curated',
    description: 'Browse, search, and download thousands of AI-generated images and prompts. Free and open.',
    url: 'https://generatedgallery.com',
    siteName: 'Generated Gallery',
    images: [{ url: '/og-image.png', width: 1200, height: 630, alt: 'Generated Gallery — AI Art, Curated' }],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Generated Gallery — AI Art, Curated',
    description: 'Browse, search, and download thousands of AI-generated images and prompts.',
    images: [{ url: '/og-image.png', alt: 'Generated Gallery' }],
  },
  alternates: {
    canonical: 'https://generatedgallery.com',
  },
  category: 'art',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${spaceGrotesk.variable} ${dmSans.variable}`}>
      <head>
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-6SXZCQGVZ9" />
        <script dangerouslySetInnerHTML={{ __html: `window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','G-6SXZCQGVZ9');` }} />
        <link rel="canonical" href="https://generatedgallery.com" />
        <meta name="theme-color" content="#050505" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebSite',
              name: 'Generated Gallery',
              url: 'https://generatedgallery.com',
              description: 'Browse, search, and download thousands of AI-generated images and prompts. Free and open.',
              potentialAction: {
                '@type': 'SearchAction',
                target: 'https://generatedgallery.com/?q={search_term_string}',
                'query-input': 'required name=search_term_string',
              },
            }),
          }}
        />
      </head>
      <body className="font-body bg-surface-0 text-white antialiased">
        <ClientProviders>
          <Navbar />
          <main className="min-h-screen">
            {children}
          </main>
          <Footer />
        </ClientProviders>
        <script defer src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token": "6ed43d34957a49fcb90ec8e43f7db523"}'></script>
        <script dangerouslySetInnerHTML={{ __html: `
          // Auto-reload on chunk load errors (stale cache after deploy)
          window.addEventListener('error', function(e) {
            if (e.message && e.message.includes('ChunkLoadError')) {
              window.location.reload();
            }
          });
        `}} />
      </body>
    </html>
  );
}
