'use client'

import React, { useState, useEffect } from 'react'
import styles from './InstallPrompt.module.css'

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const handler = (e: any) => {
      // Prevent the mini-infobar from appearing on mobile
      e.preventDefault()
      // Stash the event so it can be triggered later.
      setDeferredPrompt(e)
      setIsVisible(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    // Show the install prompt
    deferredPrompt.prompt()
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice
    console.log(`[pwa] Install prompt outcome: ${outcome}`)
    
    // We've used the prompt, and can't use it again, so clear it
    setDeferredPrompt(null)
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className={styles.overlay}>
      <div className={styles.banner}>
        <div className={styles.icon}>
          <img src="/icons/icon-192x192.png" alt="BuildWatch Icon" />
        </div>
        <div className={styles.content}>
          <h4 className={styles.title}>Install BuildWatch</h4>
          <p className={styles.text}>Add to home screen for offline project tracking</p>
        </div>
        <div className={styles.actions}>
          <button className={styles.dismiss} onClick={() => setIsVisible(false)}>
            Later
          </button>
          <button className={styles.install} onClick={handleInstall}>
            Install
          </button>
        </div>
      </div>
    </div>
  )
}
