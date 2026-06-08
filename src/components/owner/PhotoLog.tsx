'use client'

import React, { useState, useMemo } from 'react'
import { jsPDF } from 'jspdf'
import { Camera, MapPin, AlertTriangle, X, Send } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import { AIReportPanel } from './components/AIReportPanel'
import type { AIReport } from './components/AIReportPanel'
import styles from './PhotoLog.module.css'

const FALLBACK_AI_REPORT: AIReport = {
  s1_visible: 'Concrete decking shuttering visible across approximately 60% of the floor area. Rebar mesh partially visible in left frame. 3 workers visible on site. Scaffolding erected on south face.',
  s2_assessment: 'Photos correspond to early Roof Structure phase. Consistent with milestone Phase 3 as tagged by proxy.',
  s2_confidence: 'Medium',
  s3_anomalies: [
    'Rebar spacing in top-right appears wider than typical residential specification. Recommend requesting additional photos.',
    'Only 3 workers visible — may indicate reduced crew.',
  ],
  s4_limitations: 'Cannot assess: rebar diameter, concrete mix ratio, foundation depth, waterproofing below slab.',
  s5_reference: null,
}

function hasContent(r: AIReport | null): boolean {
  if (!r) return false
  return !!(r.s1_visible || r.s2_assessment || r.s3_anomalies.length > 0 || r.s4_limitations)
}

export type PhotoLogSubmission = {
  id: string
  submitterName: string
  createdAt: string
  milestoneName: string
  milestonePhase: number
  photoCount: number
  aiReport: AIReport | null
  anomalyCount: number
}

export type PhotoLogProps = {
  userName?: string
  userInitials?: string
  userPlan?: string
  projectName?: string
  submissionsDb?: PhotoLogSubmission[]
  milestonesDb?: { id: string; name: string; order: number }[]
}

export default function PhotoLog({
  userName,
  userInitials,
  userPlan,
  projectName = 'My Project',
  submissionsDb = [],
}: PhotoLogProps) {
  const [queryText, setQueryText] = useState('')
  const [annotationMode, setAnnotationMode] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  const latest = submissionsDb[activeIndex] ?? null
  const activeAiReport = latest?.aiReport && hasContent(latest.aiReport) ? latest.aiReport : FALLBACK_AI_REPORT

  const handleExportPdf = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(`AI Report — ${latest?.milestoneName ?? 'Submission'}`, 20, 30)
    doc.setFontSize(10)
    const lines = doc.splitTextToSize(latest?.aiReport?.s1_visible ?? '', 170)
    doc.text('What is visible:', 20, 45)
    doc.text(lines, 20, 53)
    doc.save('ai-report-photo-log.pdf')
  }

  const handleUploadDrawings = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.pdf,.dwg,.png,.jpg'
    input.click()
  }

  const handleSendQuery = () => {
    if (!queryText.trim()) return
    alert(`Query sent to proxy: "${queryText}"`)
    setQueryText('')
    setAnnotationMode(false)
  }

  return (
    <div className={styles.shell}>
      <Sidebar activeItem="Photo Log" projectName={projectName} userName={userName} userInitials={userInitials} userPlan={userPlan} />
      <div className={styles.mainArea}>
        <Topbar title="Photo Log">
          <button type="button" className={styles.filterBtn}>Filter: All phases ▾</button>
          <button type="button" className={styles.filterBtn}>Date ▾</button>
        </Topbar>
        <div className={styles.content}>
          <div className={styles.layout}>
            <div className={styles.leftCol}>
              {latest ? (
                <>
                  <div className={styles.photoGrid}>
                    {Array.from({ length: Math.max(latest.photoCount, 6) }).map((_, i) => (
                      <div key={i} className={`${styles.photoThumb} ${i === 0 && latest.anomalyCount > 0 ? styles.photoHighlighted : ''}`}>
                        <Camera size={24} className={styles.photoIcon} />
                        {i === 0 && latest.anomalyCount > 0 && (
                          <span className={styles.aiBadge}>AI <AlertTriangle size={10} /> {latest.anomalyCount}</span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className={styles.submissionMeta}>
                    <MapPin size={12} /> Submission · {new Date(latest.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} · {latest.submitterName} · Phase {latest.milestonePhase} — {latest.milestoneName} · {latest.photoCount} photos
                  </div>
                </>
              ) : (
                <div className={styles.emptyState}>No submissions yet</div>
              )}
              <div className={styles.divider} />
              <div className={styles.annotationSection}>
                <div className={styles.annotationHeader}>
                  Query — annotate photo
                  {annotationMode && (
                    <button type="button" className={styles.cancelAnnotate} onClick={() => setAnnotationMode(false)}>
                      <X size={14} /> Cancel
                    </button>
                  )}
                </div>
                {!annotationMode ? (
                  <button type="button" className={styles.startAnnotate} onClick={() => setAnnotationMode(true)}>
                    Start annotating
                  </button>
                ) : (
                  <>
                    <div className={styles.annotationArea}>
                      <div className={styles.annotationImage}>📷 Photo from submission</div>
                      <div className={styles.annotationCircle} />
                    </div>
                    <textarea
                      className={styles.queryInput}
                      placeholder="Describe what needs clarification..."
                      value={queryText}
                      onChange={e => setQueryText(e.target.value)}
                      rows={3}
                    />
                    <button type="button" className={styles.sendBtn} onClick={handleSendQuery}>
                      <Send size={14} /> Send query
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className={styles.rightCol}>
              <div className={styles.aiReportCard}>
                <div className={styles.aiReportHeader}>
                  AI Analysis Report <span className={styles.ownerBadge}>Owner only</span>
                </div>
                {activeAiReport ? (
                  <AIReportPanel
                    report={activeAiReport}
                    onUploadDrawings={handleUploadDrawings}
                    onExportPdf={handleExportPdf}
                  />
                ) : (
                  <div className={styles.emptyReport}>No AI report available for this submission.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
