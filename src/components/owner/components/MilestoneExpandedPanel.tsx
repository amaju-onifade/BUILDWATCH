'use client'

import React, { useState } from 'react'
import { Camera, MapPin, AlertTriangle, ArrowRight } from 'lucide-react'
import { AIReportPanel } from './AIReportPanel'
import type { AIReport } from './AIReportPanel'
import { MilestoneActionBar } from './MilestoneActionBar'
import styles from './MilestoneExpandedPanel.module.css'

type MilestoneExpandedPanelProps = {
  milestoneName: string
  milestonePhase: number
  submittedBy: string
  submittedDate: string
  aiReport?: AIReport
  onApprove: () => void
  onQuery?: () => void
  onRequestEvidence?: () => void
  onAnnotate?: () => void
  onExportPdf?: () => void
  onUploadDrawings?: () => void
}

export function MilestoneExpandedPanel({
  milestoneName,
  milestonePhase,
  submittedBy,
  submittedDate,
  aiReport,
  onApprove,
  onQuery,
  onRequestEvidence,
  onAnnotate,
  onExportPdf,
  onUploadDrawings,
}: MilestoneExpandedPanelProps) {
  const [activeTab, setActiveTab] = useState<'submission' | 'ai_report'>('submission')

  return (
    <div className={styles.panel}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'submission' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('submission')}
        >
          Submission
        </button>
        <button
          type="button"
          className={`${styles.tab} ${activeTab === 'ai_report' ? styles.tabActive : ''}`}
          onClick={() => setActiveTab('ai_report')}
        >
          AI Report
        </button>
      </div>

      {activeTab === 'submission' && (
        <div className={styles.submissionTab}>
          <div className={styles.metaBar}>
            <MapPin size={12} className={styles.inlineIcon} />
            Submitted by {submittedBy} · {submittedDate} · GPS confirmed · Phase {milestonePhase} — {milestoneName}
          </div>

          <div className={styles.photoRow}>
            <div className={styles.photoThumb}>
              <div className={styles.photoPlaceholder}>
                <Camera size={24} className={styles.cameraIcon} />
              </div>
              <span className={styles.aiBadge}>AI <AlertTriangle size={10} /></span>
            </div>
            <div className={styles.photoThumb}>
              <div className={styles.photoPlaceholder}>
                <Camera size={24} className={styles.cameraIcon} />
              </div>
            </div>
            <div className={styles.photoThumb}>
              <div className={styles.photoPlaceholder}>
                <Camera size={24} className={styles.cameraIcon} />
              </div>
            </div>
          </div>

          <div className={styles.querySection}>
            <button
              type="button"
              className={styles.annotateBtn}
              onClick={onAnnotate}
            >
              Annotate photo <ArrowRight size={16} />
            </button>
            <p className={styles.queryHelper}>
              Draw on the photo to highlight a specific area when raising a query.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'ai_report' && aiReport && (
        <AIReportPanel report={aiReport} onUploadDrawings={onUploadDrawings} onExportPdf={onExportPdf} />
      )}

      <MilestoneActionBar
        onApprove={onApprove}
        onQuery={onQuery ?? (() => {})}
        onRequestEvidence={onRequestEvidence ?? (() => {})}
      />
    </div>
  )
}
