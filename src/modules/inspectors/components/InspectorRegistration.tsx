'use client'

import React, { useState } from 'react'
import styles from './InspectorRegistration.module.css'

export function InspectorRegistration() {
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setStatus('loading')

    const formData = new FormData(e.currentTarget)
    const data = {
      name: formData.get('name'),
      registrationNumber: formData.get('registrationNumber'),
      location: formData.get('location'),
    }

    try {
      const resp = await fetch('/api/inspectors/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (resp.ok) setStatus('success')
      else setStatus('error')
    } catch {
      setStatus('error')
    }
  }

  if (status === 'success') {
    return (
      <div className={styles.success}>
        <h3>Application Received</h3>
        <p>You'll be notified once the BuildWatch Inspector Network launches in your region.</p>
      </div>
    )
  }

  return (
    <section className={styles.card}>
      <h3 className={styles.title}>Join as a Certified Inspector</h3>
      <p className={styles.subtitle}>
        Get paid to conduct physical site verifications. Register your interest for our upcoming launch.
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.field}>
          <label htmlFor="name" className={styles.label}>Full Name / Firm</label>
          <input type="text" id="name" name="name" required className={styles.input} placeholder="e.g. Adebayo & Sons Engineering" suppressHydrationWarning />
        </div>

        <div className={styles.field}>
          <label htmlFor="registrationNumber" className={styles.label}>NIQS / COREN Number</label>
          <input type="text" id="registrationNumber" name="registrationNumber" className={styles.input} placeholder="Registration ID (optional)" suppressHydrationWarning />
        </div>

        <div className={styles.field}>
          <label htmlFor="location" className={styles.label}>LGA / State</label>
          <input type="text" id="location" name="location" required className={styles.input} placeholder="e.g. Ikeja, Lagos" suppressHydrationWarning />
        </div>

        <button type="submit" disabled={status === 'loading'} className={styles.button} suppressHydrationWarning>
          {status === 'loading' ? 'Registering...' : 'Register Interest'}
        </button>
        
        {status === 'error' && <p className={styles.error}>Something went wrong. Please try again.</p>}
      </form>
    </section>
  )
}
