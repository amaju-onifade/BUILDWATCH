'use client'

import React, { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button/Button'
import { Input } from '@/components/ui/Input/Input'
import { MILESTONE_STATUS, type MilestoneRow } from '@/modules/milestones/types'
import styles from './MilestoneConfigPanel.module.css'

type Props = {
  projectId: string
  milestones: MilestoneRow[]
}

type BudgetDraft = {
  plannedCostTotal: string
  paymentScheduleType: 'single' | 'tranche3'
  tranche1Planned: string
  tranche2Planned: string
  tranche3Planned: string
}

const emptyDraft = (): BudgetDraft => ({
  plannedCostTotal: '',
  paymentScheduleType: 'single',
  tranche1Planned: '',
  tranche2Planned: '',
  tranche3Planned: '',
})

function formatNGN(value: number | null): string {
  if (value === null) return '—'
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value)
}

const STATUS_LABEL: Record<string, string> = {
  pending: 'Not started',
  in_progress: 'In progress',
  under_review: 'Under review',
  approved: 'Approved',
  locked: 'Locked',
}

export function MilestoneConfigPanel({ projectId, milestones }: Props) {
  const router = useRouter()
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Record<string, BudgetDraft>>({})
  const [saving, setSaving] = useState<Record<string, boolean>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saved, setSaved] = useState<Record<string, boolean>>({})

  const getDraft = useCallback((id: string): BudgetDraft => {
    if (drafts[id]) return drafts[id]
    const m = milestones.find(m => m.id === id)
    if (!m) return emptyDraft()
    return {
      plannedCostTotal: m.plannedCostTotal?.toString() ?? '',
      paymentScheduleType: (m.paymentScheduleType as 'single' | 'tranche3') ?? 'single',
      tranche1Planned: m.tranche1Planned?.toString() ?? '',
      tranche2Planned: m.tranche2Planned?.toString() ?? '',
      tranche3Planned: m.tranche3Planned?.toString() ?? '',
    }
  }, [drafts, milestones])

  const updateDraft = (id: string, patch: Partial<BudgetDraft>) => {
    setDrafts(prev => ({ ...prev, [id]: { ...getDraft(id), ...patch } }))
  }

  const isLocked = (m: MilestoneRow) =>
    m.status === MILESTONE_STATUS.APPROVED || m.status === MILESTONE_STATUS.LOCKED

  const handleSave = async (milestoneId: string) => {
    const draft = getDraft(milestoneId)
    setSaving(prev => ({ ...prev, [milestoneId]: true }))
    setErrors(prev => ({ ...prev, [milestoneId]: '' }))

    try {
      const body = {
        plannedCostTotal: parseFloat(draft.plannedCostTotal) || 0,
        paymentScheduleType: draft.paymentScheduleType,
        ...(draft.paymentScheduleType === 'tranche3' && {
          tranche1Planned: parseFloat(draft.tranche1Planned) || undefined,
          tranche2Planned: parseFloat(draft.tranche2Planned) || undefined,
          tranche3Planned: parseFloat(draft.tranche3Planned) || undefined,
        }),
      }

      const res = await fetch(`/api/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!res.ok) {
        const data = await res.json()
        setErrors(prev => ({ ...prev, [milestoneId]: data.error || 'Failed to save' }))
      } else {
        setSaved(prev => ({ ...prev, [milestoneId]: true }))
        setTimeout(() => setSaved(prev => ({ ...prev, [milestoneId]: false })), 2000)
        setExpandedId(null)
      }
    } catch {
      setErrors(prev => ({ ...prev, [milestoneId]: 'Network error — please try again.' }))
    } finally {
      setSaving(prev => ({ ...prev, [milestoneId]: false }))
    }
  }

  const totalAllocated = milestones.reduce((sum, m) => {
    const draft = getDraft(m.id)
    return sum + (parseFloat(draft.plannedCostTotal) || m.plannedCostTotal || 0)
  }, 0)

  return (
    <div className={styles.panel} id="milestone-config-panel">
      <div className={styles.panelHeader}>
        <div>
          <h1 className={styles.title}>Configure Milestones</h1>
          <p className={styles.subtitle}>
            Set the planned budget for each phase. Tranche mode splits a phase into 3 payments.
          </p>
        </div>
        <div className={styles.totalBadge}>
          <span className={styles.totalLabel}>Total allocated</span>
          <span className={styles.totalValue}>{formatNGN(totalAllocated)}</span>
        </div>
      </div>

      <ol className={styles.list}>
        {milestones.map((milestone) => {
          const draft = getDraft(milestone.id)
          const isExpanded = expandedId === milestone.id
          const locked = isLocked(milestone)

          return (
            <li key={milestone.id} className={styles.item} data-expanded={isExpanded} data-locked={locked}>
              <button
                type="button"
                className={styles.itemHeader}
                onClick={() => setExpandedId(isExpanded ? null : milestone.id)}
                aria-expanded={isExpanded}
                disabled={locked}
                id={`milestone-expand-${milestone.id}`}
              >
                <span className={styles.orderBadge}>{milestone.order}</span>
                <span className={styles.milestoneName}>{milestone.name}</span>
                <div className={styles.itemMeta}>
                  {milestone.plannedCostTotal !== null && (
                    <span className={styles.budgetPill}>{formatNGN(milestone.plannedCostTotal)}</span>
                  )}
                  <span
                    className={styles.statusBadge}
                    data-status={milestone.status}
                  >
                    {STATUS_LABEL[milestone.status] ?? milestone.status}
                  </span>
                  {!locked && (
                    <svg className={styles.chevron} data-open={isExpanded} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  )}
                  {locked && (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  )}
                </div>
              </button>

              {isExpanded && !locked && (
                <div className={styles.budgetForm}>
                  {errors[milestone.id] && (
                    <div role="alert" className={styles.errorAlert}>{errors[milestone.id]}</div>
                  )}

                  <div className={styles.scheduleToggle}>
                    <button
                      type="button"
                      className={styles.toggleOption}
                      data-active={draft.paymentScheduleType === 'single'}
                      onClick={() => updateDraft(milestone.id, { paymentScheduleType: 'single' })}
                      id={`schedule-single-${milestone.id}`}
                    >
                      Single payment
                    </button>
                    <button
                      type="button"
                      className={styles.toggleOption}
                      data-active={draft.paymentScheduleType === 'tranche3'}
                      onClick={() => updateDraft(milestone.id, { paymentScheduleType: 'tranche3' })}
                      id={`schedule-tranche-${milestone.id}`}
                    >
                      3-tranche payment
                    </button>
                  </div>

                  <Input
                    id={`budget-total-${milestone.id}`}
                    label="Planned cost (₦)"
                    type="number"
                    value={draft.plannedCostTotal}
                    onChange={e => updateDraft(milestone.id, { plannedCostTotal: e.target.value })}
                    placeholder="e.g. 3500000"
                  />

                  {draft.paymentScheduleType === 'tranche3' && (
                    <div className={styles.trancheGroup}>
                      <Input
                        id={`tranche1-${milestone.id}`}
                        label="Tranche 1 (₦)"
                        type="number"
                        value={draft.tranche1Planned}
                        onChange={e => updateDraft(milestone.id, { tranche1Planned: e.target.value })}
                        placeholder="e.g. 1166667"
                        helperText="Paid at phase start"
                      />
                      <Input
                        id={`tranche2-${milestone.id}`}
                        label="Tranche 2 (₦)"
                        type="number"
                        value={draft.tranche2Planned}
                        onChange={e => updateDraft(milestone.id, { tranche2Planned: e.target.value })}
                        placeholder="e.g. 1166667"
                        helperText="Paid at mid-phase"
                      />
                      <Input
                        id={`tranche3-${milestone.id}`}
                        label="Tranche 3 (₦)"
                        type="number"
                        value={draft.tranche3Planned}
                        onChange={e => updateDraft(milestone.id, { tranche3Planned: e.target.value })}
                        placeholder="e.g. 1166666"
                        helperText="Paid on completion"
                      />
                    </div>
                  )}

                  <div className={styles.formActions}>
                    <button
                      type="button"
                      className={styles.cancelBtn}
                      onClick={() => setExpandedId(null)}
                      id={`milestone-cancel-${milestone.id}`}
                    >
                      Cancel
                    </button>
                    <Button
                      id={`milestone-save-${milestone.id}`}
                      type="button"
                      isLoading={saving[milestone.id]}
                      onClick={() => handleSave(milestone.id)}
                    >
                      {saved[milestone.id] ? '✓ Saved' : 'Save budget'}
                    </Button>
                  </div>
                </div>
              )}
            </li>
          )
        })}
      </ol>

      <div className={styles.footer}>
        <Button
          id="milestone-config-done"
          type="button"
          fullWidth
          onClick={() => router.push(`/dashboard/projects/${projectId}`)}
        >
          Done — go to project dashboard
        </Button>
      </div>
    </div>
  )
}
