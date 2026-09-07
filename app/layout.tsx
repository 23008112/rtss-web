import { Analytics } from '@vercel/analytics/next'
import { DM_Sans, DM_Serif_Display, IBM_Plex_Mono } from 'next/font/google'
import type { Metadata, Viewport } from 'next'
import './globals.css'

const sans = DM_Sans({ subsets: ['latin'], variable: '--font-dm-sans' })
const serif = DM_Serif_Display({ weight: '400', subsets: ['latin'], variable: '--font-dm-serif' })
const mono = IBM_Plex_Mono({ weight: ['400', '600'], subsets: ['latin'], variable: '--font-ibm-mono' })

// Falls back to localhost so `next build` never fails without it, but a real
// deployment should set this — it anchors OG/twitter image and canonical URLs.
const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: 'RTSS Performance — Real-Time PC Performance Control',
  description:
    'RTSS Performance is a Logitech Options+ plugin that puts live FPS, CPU and GPU telemetry, frame-time analysis and frame-limit control on the MX Creative Console.',
  openGraph: {
    title: 'RTSS Performance — Real-Time PC Performance Control',
    description: 'Live gaming telemetry and FPS control on the MX Creative Console.',
    type: 'website',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'RTSS Performance — Real-Time PC Performance Control',
    description: 'Live gaming telemetry and FPS control on the MX Creative Console.',
  },
  generator: 'RTSS Performance',
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icon-dark-32x32.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: dark)' },
      { url: '/icon-light-32x32.png', sizes: '32x32', type: 'image/png', media: '(prefers-color-scheme: light)' },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f3f7f9' },
    { media: '(prefers-color-scheme: dark)', color: '#0b1015' },
  ],
  width: 'device-width',
  initialScale: 1,
}

/* Applies the stored (or system) theme before the page paints, so switching
   themes never shows a flash of the previous one. */
const themeBootstrap = `(function(){try{var t=localStorage.getItem('rtss-theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: light)').matches?'light':'dark'}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme='dark'}})()`

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="bg-background" data-theme="dark" suppressHydrationWarning>
      <body className={`${sans.variable} ${serif.variable} ${mono.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrap }} />
        {children}
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
