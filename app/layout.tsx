import './globals.css'
import LockGate from '../components/lock-gate'

export const metadata = {
  title: 'Ravi OS',
  description: 'Private personal operating system',
  robots: { index: false, follow: false, noarchive: true, nosnippet: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body><LockGate>{children}</LockGate></body>
    </html>
  )
}
