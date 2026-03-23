
import type { Metadata, Viewport } from 'next';
import './globals.css';
import { Toaster } from '@/components/ui/toaster';
import { cn } from '@/lib/utils';
import { Providers } from '@/components/providers';
import Script from 'next/script';

export const metadata: Metadata = {
  title: 'StageCalc',
  description: 'Technical planning tool for event technicians.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: '#000000',
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="apple-touch-icon" href="/icons/icon-192x192.png" />
      </head>
      <body className={cn('font-body antialiased min-h-screen bg-background font-sans')}>
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-BB5430FS2L"
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', 'G-BB5430FS2L');
          `}
        </Script>
        <Providers>
          {children}
          <Toaster />
        </Providers>
        <Script src="https://www.google.com/recaptcha/api.js?render=6LczBTssAAAAAD5lojRoHvtnJRFIw61kxNa2fLdV" strategy="lazyOnload" />
      </body>
    </html>
  );
}
