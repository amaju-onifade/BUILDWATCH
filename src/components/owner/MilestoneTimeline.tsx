'use client'

import React, { useState, useMemo } from 'react'
import Link from 'next/link'
import { jsPDF } from 'jspdf'
import { AlertCircle, UserPlus } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import { MilestoneRow } from './components/MilestoneRow'
import type { Milestone, MilestoneStatus } from './components/MilestoneRow'
import { MilestoneExpandedPanel } from './components/MilestoneExpandedPanel'
import { VerificationReceipt } from './components/VerificationReceipt'
import type { AIReport } from './components/AIReportPanel'
import styles from './MilestoneTimeline.module.css'

const DEMO_AI_REPORT: AIReport = {
  s1_visible:
    'The submission shows three photographs of roof structure work in progress. Timber rafters are visible across the full span of the structure. Ridge board and wall plates appear to be in place. Two workers are visible in the background of photo 2.',
  s2_assessment:
    'The visible work appears consistent with the Roof Structure phase. Rafter spacing appears reasonable from the available angles, though full coverage cannot be confirmed from these photos alone.',
  s2_confidence: 'Medium',
  s3_anomalies: [
    'Photo 1 shows a gap between the wall plate and the top course of blocks on the north-facing wall. This may warrant closer inspection before felt and battens are laid.',
    'Only 3 photos submitted. The south and east elevations are not visible in any submission.',
  ],
  s4_limitations:
    'This assessment is based solely on the photographs submitted. Structural integrity, load calculations, and compliance with local building codes cannot be assessed from photos. The assessor has no visibility of areas not shown in the submission.',
  s5_reference: null,
}

export type MilestoneTimelineProps = {
  userName?: string
  userInitials?: string
  userPlan?: string
  projectName?: string
  milestonesDb?: { id: string; name: string; order: number; status: string; plannedCostTotal: number | null }[]
  projectId?: string | null
  latestSubmitter?: string
  latestSubmissionDate?: string
  latestMilestoneId?: string
}

export default function MilestoneTimeline({
  userName,
  userInitials,
  userPlan,
  projectName = 'My Project',
  milestonesDb = [],
  projectId,
  latestSubmitter = '',
  latestSubmissionDate = '',
  latestMilestoneId = '',
}: MilestoneTimelineProps) {
  const milestones: Milestone[] = useMemo(() => {
    return milestonesDb.map((m, i) => ({
      id: m.id,
      phaseNumber: m.order,
      name: m.name,
      status: m.status as MilestoneStatus,
      plannedCost: m.plannedCostTotal ?? 0,
    }))
  }, [milestonesDb])

  const underReview = milestones.filter(m => m.status === 'under_review')
  const approvedCount = milestones.filter(m => m.status === 'approved').length
  const progressPct = milestones.length > 0 ? Math.round((approvedCount / milestones.length) * 100) : 0
  const activePhase = milestones.find(m => m.status === 'in_progress' || m.status === 'under_review')
  const firstUnderReview = underReview[0] ?? null

  const [expandedMilestoneId, setExpandedMilestoneId] = useState(firstUnderReview?.id ?? '')
  const [approvedMilestone, setApprovedMilestone] = useState<{ id: string; name: string; phaseNumber: number } | null>(null)

  const handleToggle = (id: string) => {
    setExpandedMilestoneId(prev => (prev === id ? '' : id))
  }

  const handleApprove = async (milestoneId: string) => {
    const ms = milestones.find(m => m.id === milestoneId)
    if (!ms) return

    try {
      const res = await fetch(`/api/milestones/${milestoneId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plannedCostTotal: ms.plannedCost ?? 0,
          paymentScheduleType: 'single',
          status: 'approved',
        }),
      })
      if (res.ok) {
        setApprovedMilestone({ id: ms.id, name: ms.name, phaseNumber: ms.phaseNumber })
      } else {
        const err = await res.json()
        alert(err.error || 'Failed to approve milestone')
      }
    } catch {
      alert('Something went wrong. Please try again.')
    }
  }

  const handleQuery = () => {
    const msg = 'Describe what needs clarification for this submission.'
    const response = prompt(msg)
    if (response?.trim()) {
      alert('Query submitted to proxy.')
    }
  }

  const handleRequestEvidence = () => {
    const msg = 'Describe what additional evidence you need.'
    const response = prompt(msg)
    if (response?.trim()) {
      alert('Evidence request sent to proxy.')
    }
  }

  const handleAnnotate = () => {
    alert('Click on a photo to start annotating.')
  }

  const handleExportPdf = () => {
    const report = DEMO_AI_REPORT
    const doc = new jsPDF()
    let y = 30
    const MARGIN = 20
    const WIDTH = 170
    const LINE_HEIGHT = 5

    doc.setFontSize(16)
    doc.text('AI Report — Roof Structure', MARGIN, y)
    y += 10

    doc.setFontSize(10)
    doc.text('What is visible:', MARGIN, y)
    y += 6
    const s1 = doc.splitTextToSize(report.s1_visible, WIDTH)
    doc.text(s1, MARGIN, y)
    y += s1.length * LINE_HEIGHT + 4

    doc.text('Stage assessment', MARGIN, y)
    y += 6
    doc.setFontSize(8)
    doc.text(`Confidence: ${report.s2_confidence}`, MARGIN, y)
    y += 4
    doc.setFontSize(10)
    const s2 = doc.splitTextToSize(report.s2_assessment, WIDTH)
    doc.text(s2, MARGIN, y)
    y += s2.length * LINE_HEIGHT + 4

    doc.text('Anomalies & concerns', MARGIN, y)
    y += 6
    report.s3_anomalies.forEach(a => {
      const lines = doc.splitTextToSize(`• ${a}`, WIDTH)
      doc.text(lines, MARGIN, y)
      y += lines.length * LINE_HEIGHT
    })
    y += 4

    doc.text('Limitations', MARGIN, y)
    y += 6
    const s4 = doc.splitTextToSize(report.s4_limitations, WIDTH)
    doc.text(s4, MARGIN, y)
    y += s4.length * LINE_HEIGHT + 4

    if (report.s5_reference) {
      if (y > 260) { doc.addPage(); y = 30 }
      doc.text('Reference comparison', MARGIN, y)
      y += 6
      const s5 = doc.splitTextToSize(report.s5_reference, WIDTH)
      doc.text(s5, MARGIN, y)
    }

    doc.setFontSize(8)
    doc.text('AI-generated report — Not a professional assessment.', MARGIN, y + 20)

    doc.save('ai-report-roof-structure.pdf')
  }

  const handleUploadDrawings = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.dwg,.png,.jpg'
    input.click()
  }

  return (
    <div className={styles.shell}>
      <Sidebar activeItem="Milestones" projectName={projectName} userName={userName} userInitials={userInitials} userPlan={userPlan} />
      <div className={styles.mainArea}>
        <Topbar title="Milestones">
          <Link href={`/projects/${projectId}`} className={styles.topGhostBtn}>
            <UserPlus size={14} /> Invite team
          </Link>
          <button
            type="button"
            className={styles.topGhostBtn}
            onClick={() => window.print()}
          >
            Export dossier
          </button>
        </Topbar>

        <div className={styles.content}>
          {/* Progress Summary Bar */}
          <div className={styles.progressCard}>
            <div className={styles.progressHeader}>
              <span className={styles.progressLabel}>Project progress — {progressPct}% complete</span>
              <span className={styles.progressMeta}>{milestones.length > 0 ? `Phase ${activePhase?.phaseNumber ?? approvedCount + 1} of ${milestones.length}` : 'No milestones'}</span>
            </div>
            <div className={styles.progressTrack}>
              <div className={styles.progressFill} style={{ width: `${progressPct}%` }} />
            </div>
          </div>

          {/* Action Required Banner */}
          {firstUnderReview && (
            <div className={styles.actionBanner}>
              <div className={styles.actionBannerContent}>
                <AlertCircle size={16} className={styles.actionBannerIcon} />
                <span className={styles.actionBannerText}>
                  Action required: {firstUnderReview.name} submission is waiting for your review.
                </span>
              </div>
              <button
                type="button"
                className={styles.reviewLink}
                onClick={() => document.getElementById(`milestone-${firstUnderReview.id}`)?.scrollIntoView({ behavior: 'smooth' })}
              >
                Review submission ↓
              </button>
            </div>
          )}

          {/* Milestone List */}
          <div className={styles.milestoneList}>
            {milestones.map((milestone) => {
              const isExpanded = expandedMilestoneId === milestone.id
              const isUnderReview = milestone.status === 'under_review'

              return (
                <div key={milestone.id} id={`milestone-${milestone.id}`}>
                  <MilestoneRow
                    milestone={milestone}
                    isExpanded={isExpanded}
                    onToggle={() => handleToggle(milestone.id)}
                    onExportPdf={() => {
                      const doc = new jsPDF()
                      doc.setFontSize(14)
                      doc.text(`Milestone: ${milestone.name}`, 20, 30)
                      doc.setFontSize(10)
                      doc.text(`Phase ${milestone.phaseNumber}`, 20, 40)
                      doc.text(`Status: ${milestone.status}`, 20, 48)
                      if (milestone.approvedDate) doc.text(`Approved: ${milestone.approvedDate}`, 20, 56)
                      doc.text(`Budget: ₦${(milestone.plannedCost ?? 0).toLocaleString()}`, 20, 64)
                      doc.save(`milestone-${milestone.id}.pdf`)
                    }}
                  >
                    {isExpanded && isUnderReview && (
                      <MilestoneExpandedPanel
                        milestoneName={milestone.name}
                        milestonePhase={milestone.phaseNumber}
                        submittedBy={milestone.id === latestMilestoneId && latestSubmitter ? latestSubmitter : 'Submitter'}
                        submittedDate={milestone.id === latestMilestoneId && latestSubmissionDate ? new Date(latestSubmissionDate).toLocaleString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                        aiReport={DEMO_AI_REPORT}
                        onApprove={() => handleApprove(milestone.id)}
                        onQuery={handleQuery}
                        onRequestEvidence={handleRequestEvidence}
                        onAnnotate={handleAnnotate}
                        onExportPdf={handleExportPdf}
                        onUploadDrawings={handleUploadDrawings}
                      />
                    )}
                  </MilestoneRow>
                </div>
              )
            })}
          </div>

          {/* Verification Receipt (shown after approve) */}
          {approvedMilestone && (
            <div className={styles.receiptSection}>
              <VerificationReceipt
                milestoneName={approvedMilestone.name}
                milestonePhase={approvedMilestone.phaseNumber}
                approvedBy={userName ?? 'Owner'}
                approvedDate={new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
