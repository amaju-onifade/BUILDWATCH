'use client'

import React from 'react'
import { jsPDF } from 'jspdf'
import { Camera, Lock } from 'lucide-react'
import Sidebar from './components/Sidebar'
import Topbar from './components/Topbar'
import styles from './ProxyAuditTrail.module.css'

export type AuditEntry = {
  title: string
  meta: string
  gps: string
  thumbnails: number
}

export type ProxyAuditTrailProps = {
  userName?: string
  userInitials?: string
  userPlan?: string
  projectName?: string
  proxyName?: string
  entries?: AuditEntry[]
  visitCount?: number
}

export default function ProxyAuditTrail({
  userName,
  userInitials,
  userPlan,
  projectName = 'My Project',
  proxyName = 'Proxy',
  entries = [],
  visitCount = 0,
}: ProxyAuditTrailProps) {
  const initials = proxyName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'PR'

  const handleExportProxyPdf = () => {
    const doc = new jsPDF()
    doc.setFontSize(16)
    doc.text(`Proxy Report — ${proxyName}`, 20, 30)
    doc.setFontSize(10)
    doc.text(`${visitCount} site visit(s) recorded`, 20, 40)
    entries.forEach((entry, i) => {
      const y = 55 + i * 10
      if (y > 270) return
      doc.text(`📷 ${entry.title}`, 20, y)
      doc.setFontSize(8)
      doc.text(entry.meta, 20, y + 4)
      doc.setFontSize(10)
    })
    doc.save(`proxy-report-${proxyName.toLowerCase().replace(/\s+/g, '-')}.pdf`)
  }

  const handleExportDossier = () => {
    window.print()
  }

  return (
    <div className={styles.shell}>
      <Sidebar activeItem="Proxy Audit Trail" projectName={projectName} userName={userName} userInitials={userInitials} userPlan={userPlan} />
      <div className={styles.mainArea}>
        <Topbar title="Proxy Audit Trail">
          <button type="button" className={styles.topBtn} onClick={handleExportDossier}>
            Export milestone dossier
          </button>
        </Topbar>
        <div className={styles.content}>
          <div className={styles.proxyCard}>
            <div className={styles.proxyInfo}>
              <div className={styles.proxyAvatar}>{initials}</div>
              <div>
                <div className={styles.proxyName}>{proxyName}</div>
                <div className={styles.proxyMeta}>Proxy · {visitCount} site visit(s) recorded</div>
              </div>
              <button type="button" className={styles.exportBtn} onClick={handleExportProxyPdf}>
                Export proxy PDF
              </button>
            </div>
          </div>

          <div className={styles.auditCard}>
            {entries.length === 0 ? (
              <div className={styles.auditRow}>
                <div className={styles.auditContent}>
                  <div className={styles.auditTitle}>No submissions recorded yet</div>
                </div>
              </div>
            ) : (
              entries.map((entry, i) => (
                <div key={i} className={styles.auditRow}>
                  <span className={styles.auditIcon}>📷</span>
                  <div className={styles.auditContent}>
                    <div className={styles.auditTitle}>{entry.title}</div>
                    <div className={styles.auditMeta}>{entry.meta}</div>
                    <div className={styles.auditGps}>📍 {entry.gps}</div>
                  </div>
                  {entry.thumbnails > 0 && (
                    <div className={styles.thumbStrip}>
                      {Array.from({ length: Math.min(entry.thumbnails, 3) }).map((_, j) => (
                        <div key={j} className={styles.thumbMini}>
                          <Camera size={10} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <div className={styles.lockNotice}>
            <Lock size={14} />
            Audit trail records are read-only and cannot be edited or deleted by any user.
          </div>
        </div>
      </div>
    </div>
  )
}
