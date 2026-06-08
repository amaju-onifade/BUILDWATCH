import React from 'react'
import styles from './StatCard.module.css'

export type StatVariant = 'default' | 'warning' | 'primary' | 'error'

export type StatCardProps = {
  label: string
  value: string
  sub: React.ReactNode
  variant?: StatVariant
}

const variantStyles: Record<StatVariant, string> = {
  default: '',
  warning: styles.valueWarning,
  primary: styles.valuePrimary,
  error: styles.valueError,
}

export default function StatCard({
  label,
  value,
  sub,
  variant = 'default',
}: StatCardProps) {
  return (
    <div className={styles.card}>
      <div className={styles.label}>{label}</div>
      <div className={`${styles.value} ${variantStyles[variant]}`}>{value}</div>
      <div className={styles.sub}>{sub}</div>
    </div>
  )
}
