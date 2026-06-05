'use client'

import React, { useState } from 'react'
import { approveMilestoneAction } from '../../actions/approveMilestone'
import styles from './ApproveButton.module.css'

type Props = {
  projectId: string
  milestoneId: string
}

export function ApproveButton({ projectId, milestoneId }: Props) {
  const [isPending, setIsPending] = useState(false)

  const handleApprove = async () => {
    if (!confirm('Are you sure you want to approve this phase? This will mark the work as verified.')) return
    
    setIsPending(true)
    try {
      const res = await approveMilestoneAction(projectId, milestoneId)
      if (res.error) {
        alert(res.error)
      }
    } catch (err) {
      alert('Failed to approve milestone. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <button 
      onClick={handleApprove} 
      className={styles.button}
      disabled={isPending}
    >
      {isPending ? 'Approving...' : 'Approve Phase'}
    </button>
  )
}
