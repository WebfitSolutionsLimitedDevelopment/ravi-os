'use client'

import { useEffect } from 'react'

// Registers the existing reminder-caching service worker so the app can be
// added to the home screen and stays a little more resilient offline.
export default function SwRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}
