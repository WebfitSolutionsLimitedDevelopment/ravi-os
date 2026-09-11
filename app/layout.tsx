import './globals.css'
import './home-reminders.css'
import './home-polish.css'
import LockGate from '../components/lock-gate'
import TaskNavigationBridge from '../components/task-navigation-bridge'
import HomePolishBridge from '../components/home-polish-bridge'

export const metadata = {
  title: 'Ravi OS',
  description: 'Private personal operating system',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><LockGate>{children}</LockGate><TaskNavigationBridge/><HomePolishBridge/></body>
    </html>
  )
}
