import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'
import '@fontsource/inter/600.css'
import '@fontsource/inter/700.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
import '@fontsource/noto-sans-devanagari/400.css'
import '@fontsource/noto-sans-devanagari/600.css'
import '@fontsource/noto-sans-devanagari/700.css'
import './globals.css'

export const metadata: Metadata = {
  title: 'HisabJod - Digital Khata | Udhar Hisab | Marathi Hindi',
  description: 'Simple. Secure. Offline. Khata for Kirana, dukaan. Track udhar, manage payments, never miss due. Marathi, Hindi, English. Free backup.',
  generator: 'v0.app',
  manifest: '/manifest.json',
  keywords: ['khata','udhar','hisab','HisabJod','digital khata','marathi khata','hindi khata','kirana','dukaan','udhar hisab','bahikhata'],
  applicationName: 'HisabJod',
  icons: {
    icon: [
      { url: '/icon-light-32x32.png', media: '(prefers-color-scheme: light)' },
      { url: '/icon-dark-32x32.png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon.svg', type: 'image/svg+xml' },
    ],
    apple: '/apple-icon.png',
  },
  openGraph: {
    title: 'HisabJod - Digital Khata',
    description: 'Track customers, manage udhar, WhatsApp reminders. Offline. Free.',
    type: 'website',
    locale: 'en_IN',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f7f4' },
    { media: '(prefers-color-scheme: dark)', color: '#0a1510' },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
