'use client'

import React from 'react'
import styles from './InviteTeam.module.css'

type InviteSubSectionProps = {
  label: string
  href?: string
  helperText: string
  chipLabel: string
  chipVariant: 'required' | 'optional'
  statusLabel: string
  statusVariant: 'pending' | 'accepted'
}

function InviteSubSection({
  label,
  helperText,
  chipLabel,
  chipVariant,
  statusLabel,
  statusVariant,
}: InviteSubSectionProps) {
  const handleCopy = () => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://buildwatch.app'
    navigator.clipboard.writeText(`${base}/invite/${crypto.randomUUID()}`)
  }

  const handleWhatsApp = () => {
    const base = typeof window !== 'undefined' ? window.location.origin : 'https://buildwatch.app'
    const url = `${base}/invite/${crypto.randomUUID()}`
    const msg = encodeURIComponent(`You've been invited to track a project on BuildWatch. Tap the link to get started: ${url}`)
    window.open(`https://wa.me/?text=${msg}`, '_blank', 'noopener')
  }

  return (
    <div className={styles.subSection}>
      <div className={styles.subHeader}>
        <span className={styles.subLabel}>{label}</span>
        <span className={`${styles.subChip} ${chipVariant === 'required' ? styles.chipRequired : styles.chipOptional}`}>
          {chipLabel}
        </span>
      </div>
      <p className={styles.subHelper}>{helperText}</p>
      <div className={styles.buttonRow}>
        <button type="button" className={styles.secondaryBtn} onClick={handleCopy}>
          Copy invite link
        </button>
        <button type="button" className={styles.primaryBtn} onClick={handleWhatsApp}>
          Send via WhatsApp
        </button>
      </div>
      <p className={styles.expiry}>Link expires in 7 days · Single use</p>
      <span className={`${styles.statusChip} ${statusVariant === 'pending' ? styles.statusPending : styles.statusAccepted}`}>
        {statusLabel}
      </span>
    </div>
  )
}

type InviteTeamProps = {
  proxyStatus: 'pending' | 'accepted'
  contractorStatus: 'pending' | 'accepted' | 'none'
}

export function InviteTeam({ proxyStatus, contractorStatus }: InviteTeamProps) {
  return (
    <div className={styles.card}>
      <h2 className={styles.sectionTitle}>Invite team</h2>

      <div className={styles.columns}>
        <InviteSubSection
          label="Site proxy"
          chipLabel="Required"
          chipVariant="required"
          helperText="Your proxy visits the site and submits photo updates on your behalf."
          statusLabel={proxyStatus === 'pending' ? 'Awaiting proxy acceptance' : 'Accepted'}
          statusVariant={proxyStatus}
        />

        <InviteSubSection
          label="Contractor"
          chipLabel="Optional"
          chipVariant="optional"
          helperText="Add your contractor so they receive milestone completion notifications and payment alerts."
          statusLabel={contractorStatus === 'accepted' ? 'Accepted' : 'Not invited'}
          statusVariant={contractorStatus === 'accepted' ? 'accepted' : 'pending'}
        />
      </div>
    </div>
  )
}
