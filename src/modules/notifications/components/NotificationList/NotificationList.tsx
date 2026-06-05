'use client'

import React from 'react'
import styles from './NotificationList.module.css'

type Notification = {
  id: string
  title: string
  body: string
  createdAt: string
  readAt: string | null
  type: string
}

type Props = {
  notifications: Notification[]
  onMarkAsRead: (id: string) => void
}

export function NotificationList({ notifications, onMarkAsRead }: Props) {
  if (notifications.length === 0) {
    return (
      <div className={styles.empty}>
        <p>No notifications yet</p>
      </div>
    )
  }

  return (
    <ul className={styles.list}>
      {notifications.map((n) => (
        <li 
          key={n.id} 
          className={`${styles.item} ${!n.readAt ? styles.unread : ''}`}
          onClick={() => !n.readAt && onMarkAsRead(n.id)}
        >
          <div className={styles.dot} />
          <div className={styles.content}>
            <h4 className={styles.title}>{n.title}</h4>
            <p className={styles.body}>{n.body}</p>
            <span className={styles.time}>
              {new Date(n.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
        </li>
      ))}
    </ul>
  )
}
