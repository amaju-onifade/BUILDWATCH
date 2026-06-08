'use client'

import React from 'react'
import Link from 'next/link'
import { Bell } from 'lucide-react'
import styles from './Topbar.module.css'

export type TopbarProps = {
  title: string
  children?: React.ReactNode
  onNotificationClick?: () => void
}

export default function Topbar({ title, children, onNotificationClick }: TopbarProps) {
  return (
    <header className={styles.topbar}>
      <h1 className={styles.title}>{title}</h1>
      <div className={styles.actions}>
        {children ?? (
          <>
            <button
              className={styles.iconBtn}
              aria-label="Notifications"
              onClick={onNotificationClick}
            >
              <Bell size={16} />
              <span className={styles.notifDot} />
            </button>
            <Link href="/projects/new" className={styles.primaryBtn}>
              + New Project
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
