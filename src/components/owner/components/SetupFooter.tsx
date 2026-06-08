'use client'

import React from 'react'
import { ArrowRight } from 'lucide-react'
import styles from './SetupFooter.module.css'

type Step = {
  label: string
  active: boolean
}

const STEPS: Step[] = [
  { label: 'Project details', active: true },
  { label: 'Milestones', active: false },
  { label: 'Team', active: false },
  { label: 'Review', active: false },
]

type SetupFooterProps = {
  onSaveDraft: () => void
  onContinue: () => void
}

export function SetupFooter({ onSaveDraft, onContinue }: SetupFooterProps) {
  return (
    <footer className={styles.footer}>
      <div className={styles.progress}>
        {STEPS.map((step, i) => (
          <React.Fragment key={step.label}>
            <div className={`${styles.step} ${step.active ? styles.stepActive : ''}`}>
              <span className={`${styles.dot} ${step.active ? styles.dotActive : styles.dotInactive}`} />
              <span className={`${styles.stepLabel} ${step.active ? styles.stepLabelActive : ''}`}>{step.label}</span>
            </div>
            {i < STEPS.length - 1 && <span className={styles.connector} />}
          </React.Fragment>
        ))}
      </div>

      <div className={styles.actions}>
        <button type="button" className={styles.ghostBtn} onClick={onSaveDraft}>
          Save draft
        </button>
        <button type="button" className={styles.primaryBtn} onClick={onContinue}>
          Continue <ArrowRight size={16} />
        </button>
      </div>
    </footer>
  )
}
