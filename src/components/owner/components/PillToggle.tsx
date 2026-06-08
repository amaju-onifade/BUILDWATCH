'use client'

import React from 'react'
import styles from './PillToggle.module.css'

type PillToggleProps = {
  options: string[]
  activeIndex: number
  onChange: (index: number) => void
}

export function PillToggle({ options, activeIndex, onChange }: PillToggleProps) {
  return (
    <div className={styles.container}>
      {options.map((option, i) => (
        <button
          key={option}
          type="button"
          className={`${styles.option} ${i === activeIndex ? styles.active : ''}`}
          onClick={() => onChange(i)}
        >
          {option}
        </button>
      ))}
    </div>
  )
}
