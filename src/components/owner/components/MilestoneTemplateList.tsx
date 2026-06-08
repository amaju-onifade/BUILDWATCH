'use client'

import React from 'react'
import { Check, GripVertical } from 'lucide-react'
import styles from './MilestoneTemplateList.module.css'

export type MilestoneConfig = {
  id: string
  phaseNumber: number
  name: string
  durationWeeks: number
  status: 'done' | 'active' | 'pending'
  plannedCost: number
  paymentType: 'single' | 'tranche'
  tranches?: {
    advance: number
    midway: number
    final: number
  }
}

export const DEFAULT_MILESTONES: MilestoneConfig[] = [
  { id: 'm1', phaseNumber: 1, name: 'Land Clearing & Foundation', durationWeeks: 4, status: 'done', plannedCost: 800000, paymentType: 'single' },
  { id: 'm2', phaseNumber: 2, name: 'Block-laying to Lintel Level', durationWeeks: 6, status: 'done', plannedCost: 1200000, paymentType: 'single' },
  { id: 'm3', phaseNumber: 3, name: 'Roof Structure', durationWeeks: 5, status: 'active', plannedCost: 1500000, paymentType: 'tranche', tranches: { advance: 400000, midway: 600000, final: 500000 } },
  { id: 'm4', phaseNumber: 4, name: 'External Plastering', durationWeeks: 4, status: 'pending', plannedCost: 700000, paymentType: 'single' },
  { id: 'm5', phaseNumber: 5, name: 'Electrical First Fix', durationWeeks: 3, status: 'pending', plannedCost: 600000, paymentType: 'single' },
  { id: 'm6', phaseNumber: 6, name: 'Plumbing First Fix', durationWeeks: 3, status: 'pending', plannedCost: 550000, paymentType: 'single' },
  { id: 'm7', phaseNumber: 7, name: 'Internal Plastering & Screeding', durationWeeks: 4, status: 'pending', plannedCost: 800000, paymentType: 'single' },
  { id: 'm8', phaseNumber: 8, name: 'Windows & Doors', durationWeeks: 3, status: 'pending', plannedCost: 900000, paymentType: 'single' },
  { id: 'm9', phaseNumber: 9, name: 'Electrical Second Fix', durationWeeks: 2, status: 'pending', plannedCost: 400000, paymentType: 'single' },
  { id: 'm10', phaseNumber: 10, name: 'Plumbing Second Fix', durationWeeks: 2, status: 'pending', plannedCost: 350000, paymentType: 'single' },
  { id: 'm11', phaseNumber: 11, name: 'Tiling & Finishing', durationWeeks: 5, status: 'pending', plannedCost: 1000000, paymentType: 'single' },
  { id: 'm12', phaseNumber: 12, name: 'External Works & Landscaping', durationWeeks: 4, status: 'pending', plannedCost: 500000, paymentType: 'single' },
]

type MilestoneTemplateListProps = {
  milestones?: MilestoneConfig[]
  selectedMilestoneId: string
  onSelectMilestone: (id: string) => void
  onNameChange?: (id: string, name: string) => void
  onDurationChange?: (id: string, weeks: number) => void
  onAddPhase?: () => void
}

export function MilestoneTemplateList({
  milestones = DEFAULT_MILESTONES,
  selectedMilestoneId,
  onSelectMilestone,
  onAddPhase,
}: MilestoneTemplateListProps) {
  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h2 className={styles.sectionTitle}>Milestone template</h2>
        <span className={styles.chip}>Pre-selected</span>
      </div>

      <div className={styles.templateSelector}>
        <div className={styles.templateOptionSelected}>
          <Check size={14} className={styles.templateTick} />
          <span className={styles.templateName}>Nigerian Residential (Default)</span>
        </div>
        <div className={styles.templateOptionMuted}>
          <span className={styles.templateName}>Custom</span>
        </div>
      </div>

      <div className={styles.milestoneList}>
        {milestones.map((m) => {
          const isSelected = m.id === selectedMilestoneId
          return (
            <div
              key={m.id}
              className={`${styles.milestoneRow} ${isSelected ? styles.milestoneSelected : ''}`}
              onClick={() => onSelectMilestone(m.id)}
            >
              <GripVertical size={14} className={styles.dragHandle} />
              <span className={styles.phaseNumber}>Phase {m.phaseNumber}</span>
              <span className={styles.phaseName}>{m.name}</span>
              <input
                type="number"
                className={styles.durationInput}
                value={m.durationWeeks}
                readOnly
                onClick={(e) => e.stopPropagation()}
              />
              <span className={`${styles.statusChip} ${styles[`status${m.status.charAt(0).toUpperCase() + m.status.slice(1)}`]}`}>
                {m.status === 'done' ? 'Done' : m.status === 'active' ? 'Active' : 'Pending'}
              </span>
            </div>
          )
        })}
      </div>

      <button type="button" className={styles.addPhase} onClick={onAddPhase}>
        + Add custom phase
      </button>
    </div>
  )
}
