import './globals.css'
import './home-reminders.css'
import './home-polish.css'
import './global-intelligence.css'
import LockGate from '../components/lock-gate'
import TaskNavigationBridge from '../components/task-navigation-bridge'
import HomePolishBridge from '../components/home-polish-bridge'
import FamilyNavigationBridge from '../components/family-navigation-bridge'
import JournalNavigationBridge from '../components/journal-navigation-bridge'
import FinanceNavigationBridge from '../components/finance-navigation-bridge'
import GlobalRaviVoice from '../components/global-ravi-voice'
import SwRegister from '../components/sw-register'

export const metadata = {
  title: 'Ravi OS',
  description: 'Private personal operating system',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
  icons: {
    icon: ['/icons/favicon-32.png', '/icons/icon-192.png'],
    apple: '/icons/apple-touch-icon.png',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ravi OS',
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#173d2f',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><LockGate>{children}</LockGate><TaskNavigationBridge/><HomePolishBridge/><FamilyNavigationBridge/><JournalNavigationBridge/><FinanceNavigationBridge/><GlobalRaviVoice/><SwRegister/></body>
    </html>
  )
}
