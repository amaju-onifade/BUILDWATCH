'use client'

import React, { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import styles from './InspectorsPage.module.css'

export type InspectorsPageProps = {
  userName?: string
  userInitials?: string
  userPlan?: string
}

export default function InspectorsPage({ userName, userInitials, userPlan }: InspectorsPageProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [location, setLocation] = useState('')
  const [inspectionNeed, setInspectionNeed] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !email.trim() || !location.trim()) return
    setSubmitted(true)
  }

  return (
    <div className={styles.shell}>
      <Sidebar activeItem="Inspectors" userName={userName} userInitials={userInitials} userPlan={userPlan} />
      <div className={styles.mainArea}>
        <Topbar title='Inspector Network'>
          <span className={styles.soonBadge}>Coming soon</span>
        </Topbar>
        <div className={styles.content} style={{ maxWidth: 560 }}>
          <div className={styles.ctaCard}>
            <h4 className={styles.ctaTitle}>Get a certified inspector on your site</h4>
            <p className={styles.ctaBody}>
              A COREN-registered engineer or NIESV-certified surveyor visits your site and submits
              an independent verification report — the ground truth that photos alone cannot provide.
            </p>
          </div>

          {submitted ? (
            <div className={styles.successCard}>
              <div className={styles.successIcon}>✓</div>
              <div className={styles.successTitle}>Interest registered</div>
              <p className={styles.successBody}>
                We&apos;ll notify you when inspector booking becomes available in your area.
              </p>
            </div>
          ) : (
            <form className={styles.formCard} onSubmit={handleSubmit}>
              <div className={styles.formTitle}>Register your interest</div>
              <label className={styles.field}>
                <span className={styles.label}>Full name</span>
                <input
                  className={styles.input}
                  value={name}
                  onChange={e => setName(e.target.value)}
                  placeholder="Your full name"
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Email</span>
                <input
                  className={styles.input}
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>Project location (State)</span>
                <input
                  className={styles.input}
                  value={location}
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. Gombe State"
                  required
                />
              </label>
              <label className={styles.field}>
                <span className={styles.label}>When do you need an inspection?</span>
                <input
                  className={styles.input}
                  value={inspectionNeed}
                  onChange={e => setInspectionNeed(e.target.value)}
                  placeholder="e.g. During roofing phase — July 2026"
                />
              </label>
              <button type="submit" className={styles.submitBtn}>
                Register interest <ArrowRight size={14} />
              </button>
            </form>
          )}

          <div className={styles.vettingSection}>
            <div className={styles.vettingTitle}>Inspector vetting standards</div>
            <div className={styles.vettingList}>
              <div className={styles.vettingItem}>✓ COREN registration (structural engineers)</div>
              <div className={styles.vettingItem}>✓ NIESV membership (quantity surveyors)</div>
              <div className={styles.vettingItem}>✓ Minimum 3 verified client references</div>
              <div className={styles.vettingItem}>✓ NIN verification</div>
              <div className={styles.vettingItem}>✓ BuildWatch inspector training module (2 hours)</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
