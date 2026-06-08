'use client'

import React from 'react'
import { MapPin } from 'lucide-react'
import { PillToggle } from './PillToggle'
import styles from './GPSAnchor.module.css'

const GPS_OPTIONS = ['Address', 'Google Maps pin', 'Proxy first visit']

type GPSMethod = 'address' | 'pin' | 'proxy'

type GPSAnchorProps = {
  gpsMethod: GPSMethod
  onChange: (method: GPSMethod) => void
}

export function GPSAnchor({ gpsMethod, onChange }: GPSAnchorProps) {
  const activeIndex = GPS_OPTIONS.findIndex((_, i) => {
    if (i === 0 && gpsMethod === 'address') return true
    if (i === 1 && gpsMethod === 'pin') return true
    if (i === 2 && gpsMethod === 'proxy') return true
    return false
  })

  const handleToggle = (index: number) => {
    const methods: GPSMethod[] = ['address', 'pin', 'proxy']
    onChange(methods[index])
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.sectionTitle}>GPS anchor</h2>
        <span className={styles.chip}>Required</span>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Set site location</label>
        <PillToggle options={GPS_OPTIONS} activeIndex={activeIndex} onChange={handleToggle} />
      </div>

      {(gpsMethod === 'address' || gpsMethod === 'pin') && (
        <div className={styles.mapPlaceholder}>
          <MapPin size={24} className={styles.pinIcon} />
          <span className={styles.mapLabel}>Site pin · Ikeja, Gombe</span>
        </div>
      )}

      {gpsMethod === 'proxy' && (
        <div className={styles.infoBox}>
          <p className={styles.infoText}>
            GPS will be anchored automatically from your proxy&apos;s first photo submission. All future
            submissions will be validated against this anchor.
          </p>
        </div>
      )}
    </div>
  )
}
