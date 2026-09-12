export const metadata = {
  title: 'Geet',
  manifest: '/geet/manifest.webmanifest',
  icons: {
    icon: ['/icons/geet-favicon-32.png', '/icons/geet-icon-192.png'],
    apple: '/icons/geet-apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Geet',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#6b2c8f',
}

export default function GeetLayout({ children }: { children: React.ReactNode }) {
  return children
}
