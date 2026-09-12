import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Ravi OS',
    short_name: 'Ravi OS',
    description: 'Private personal operating system',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f8faf9',
    theme_color: '#173d2f',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
