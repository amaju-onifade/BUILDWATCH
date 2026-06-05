import React from 'react'
import Link from 'next/link'
import styles from './OnboardingChecklist.module.css'

interface Step {
  id: string
  label: string
  isComplete: boolean
  link: string
  icon: string
}

interface OnboardingChecklistProps {
  steps: Step[]
}

export function OnboardingChecklist({ steps }: OnboardingChecklistProps) {
  const completedCount = steps.filter(s => s.isComplete).length
  const progressPercent = Math.round((completedCount / steps.length) * 100)

  if (progressPercent === 100) return null

  return (
    <div className={styles.checklistCard}>
      <div className={styles.checklistHeader}>
        <div>
          <h3 className={styles.checklistTitle}>Complete your setup</h3>
          <p className={styles.checklistSubtitle}>Follow these steps to get the most out of BuildWatch.</p>
        </div>
        <div className={styles.progressCircle}>
          <svg viewBox="0 0 36 36" className={styles.circularChart}>
            <path className={styles.circleBg}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path className={styles.circle}
              strokeDasharray={`${progressPercent}, 100`}
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <text x="18" y="20.35" className={styles.percentage}>{progressPercent}%</text>
          </svg>
        </div>
      </div>

      <ul className={styles.stepList}>
        {steps.map((step) => (
          <li key={step.id} className={styles.stepItem} data-complete={step.isComplete}>
            <div className={styles.stepIcon}>{step.icon}</div>
            <div className={styles.stepContent}>
              {step.isComplete ? (
                <span className={styles.stepLabel}>{step.label}</span>
              ) : (
                <Link href={step.link} className={styles.stepLink}>
                  {step.label} <span>→</span>
                </Link>
              )}
            </div>
            {step.isComplete && (
               <div className={styles.checkMark}>
                 <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                   <polyline points="20 6 9 17 4 12"></polyline>
                 </svg>
               </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}
