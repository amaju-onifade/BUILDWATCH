'use client'

import React from 'react'
import { Check, MessageSquare } from 'lucide-react'
import styles from './VerificationReceipt.module.css'

type VerificationReceiptProps = {
  milestoneName: string
  milestonePhase: number
  approvedBy: string
  approvedDate: string
}

export function VerificationReceipt({
  milestoneName,
  milestonePhase,
  approvedBy,
  approvedDate,
}: VerificationReceiptProps) {
  const handleWhatsApp = () => {
    window.open('https://wa.me/?text=BuildWatch+verification+receipt', '_blank', 'noopener')
  }

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <span className={styles.checkIcon}><Check size={16} /></span>
        <h3 className={styles.headerTitle}>Milestone {milestonePhase} — Verification Receipt</h3>
      </div>

      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>{milestoneName}</span>
          <span className={styles.rowValueApproved}>Approved</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Approved by</span>
          <span className={styles.rowValue}>{approvedBy} · {approvedDate}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Payment status</span>
          <span className={styles.rowValueNotified}><Check size={14} /> Contractor notified</span>
        </div>
      </div>

      <button type="button" className={styles.waBtn} onClick={handleWhatsApp}>
        <MessageSquare size={16} /> Send receipt via WhatsApp
      </button>
    </div>
  )
}
