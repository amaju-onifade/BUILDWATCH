'use client'

import { useEffect } from 'react'

/**
 * ServiceWorkerRegistrar handles the registration and lifecycle of the 
 * custom PWA Service Worker. Mounted in the project root layout.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then((reg) => {
          console.log('[sw] Registered with scope:', reg.scope)
          
          // Check for updates on load
          reg.update().catch(() => {
            // silent — offline may block this
          })

          // Setup background sync if supported
          if ('sync' in reg) {
            // We'll request sync when the app loads as a cleanup measure
            (reg as any).sync.register('submission-sync').catch((err: any) => {
              console.warn('[sw] Sync registration failed:', err)
            })
          }
        })
        .catch((err) => {
          // Non-fatal — app still functions online
          console.warn('[sw] Registration failed:', err)
        })
    }
  }, [])

  return null
}
