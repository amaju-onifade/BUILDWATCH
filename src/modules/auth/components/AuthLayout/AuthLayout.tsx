import React from 'react'
import { Card } from '@/components/ui/Card/Card'
import styles from './AuthLayout.module.css'

export function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.container}>
      <div className={styles.logo}>BuildWatch</div>
      <Card className={styles.card}>
        {children}
      </Card>
    </div>
  )
}
