'use client'

import React, { useState } from 'react'
import { Check, X, Lightbulb } from 'lucide-react'
import { PillToggle } from './PillToggle'
import type { MilestoneConfig } from './MilestoneTemplateList'
import styles from './PaymentScheduleCard.module.css'

type PaymentScheduleCardProps = {
  milestone: MilestoneConfig
}

function formatCurrency(amount: number): string {
  return `₦${amount.toLocaleString('en-US')}`
}

export function PaymentScheduleCard({ milestone }: PaymentScheduleCardProps) {
  const [paymentType, setPaymentType] = useState<'single' | 'tranche'>(milestone.paymentType)
  const [advance, setAdvance] = useState(milestone.tranches?.advance ?? 0)
  const [midway, setMidway] = useState(milestone.tranches?.midway ?? 0)
  const [finalAmt, setFinal] = useState(milestone.tranches?.final ?? 0)

  const paymentTypeIndex = paymentType === 'tranche' ? 1 : 0

  const handlePaymentTypeChange = (index: number) => {
    setPaymentType(index === 1 ? 'tranche' : 'single')
  }

  const trancheSum = advance + midway + finalAmt
  const diff = trancheSum - milestone.plannedCost
  const diffPercent = Math.abs(diff) / milestone.plannedCost
  const isMatched = diffPercent <= 0.05

  return (
    <div className={styles.card}>
      <h3 className={styles.sectionTitle}>Payment schedule — {milestone.name}</h3>

      <div className={styles.field}>
        <label className={styles.label}>Payment type</label>
        <PillToggle options={['Single payment', '3-Tranche (Recommended)']} activeIndex={paymentTypeIndex} onChange={handlePaymentTypeChange} />
      </div>

      {paymentType === 'tranche' && (
        <>
          <div className={styles.row}>
            <div className={styles.halfField}>
              <label className={styles.label}>Advance (tranche 1)</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputPrefix}>₦</span>
                <input
                  type="number"
                  className={styles.input}
                  value={advance}
                  onChange={(e) => setAdvance(Number(e.target.value))}
                />
              </div>
            </div>
            <div className={styles.halfField}>
              <label className={styles.label}>Mid-way (tranche 2)</label>
              <div className={styles.inputWrapper}>
                <span className={styles.inputPrefix}>₦</span>
                <input
                  type="number"
                  className={styles.input}
                  value={midway}
                  onChange={(e) => setMidway(Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Final (tranche 3)</label>
            <div className={styles.inputWrapper}>
              <span className={styles.inputPrefix}>₦</span>
              <input
                type="number"
                className={styles.input}
                value={finalAmt}
                onChange={(e) => setFinal(Number(e.target.value))}
              />
            </div>
          </div>

          <div className={`${styles.validator} ${isMatched ? styles.valid : styles.invalid}`}>
            <span className={styles.validatorLabel}>Total tranches</span>
            <span className={styles.validatorValue}>
              {formatCurrency(trancheSum)}{' '}
              {isMatched ? (
                <span className={styles.validText}><Check size={14} /> Matches planned cost</span>
              ) : (
                <span className={styles.invalidText}><X size={14} /> Variance: {diff > 0 ? '+' : ''}{formatCurrency(diff)} from planned cost</span>
              )}
            </span>
          </div>
        </>
      )}

      {paymentType === 'single' && (
        <div className={styles.field}>
          <label className={styles.label}>Payment amount</label>
          <div className={styles.inputWrapper}>
            <span className={styles.inputPrefix}>₦</span>
            <input
              type="number"
              className={styles.input}
              value={milestone.plannedCost}
              readOnly
            />
          </div>
        </div>
      )}

      <div className={styles.tipBox}>
        <Lightbulb size={16} className={styles.tipIcon} />
        <p className={styles.tipText}>
          Partnership tip: Ensure you and your contractor explicitly agree on this payment schedule before work begins to avoid payment disputes and site delays.
        </p>
      </div>
    </div>
  )
}
