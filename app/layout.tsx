import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
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
  colorScheme: 'light dark',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
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
