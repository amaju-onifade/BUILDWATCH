import React, { HTMLAttributes } from 'react'
import styles from './Card.module.css'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function Card({ className, children, ...props }: CardProps) {
  return (
    <div className={`${styles.card} ${className || ''}`} {...props}>
      {children}
    </div>
  )
}
