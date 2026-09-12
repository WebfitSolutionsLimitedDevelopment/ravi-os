import { NextResponse } from 'next/server'

// A separate installable-app manifest for Geet's own page, distinct from
// the main Ravi OS manifest, so "Add to Home Screen" from /geet gives her
// a Geet-branded icon that opens straight into /geet.
export async function GET() {
  return NextResponse.json(
    {
      name: 'Geet',
      short_name: 'Geet',
      description: "Geet's family space in Ravi OS",
      start_url: '/geet',
      scope: '/geet',
      display: 'standalone',
      background_color: '#f8faf9',
      theme_color: '#6b2c8f',
      icons: [
        { src: '/icons/geet-icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/geet-icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/geet-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    { headers: { 'Content-Type': 'application/manifest+json' } }
  )
}
