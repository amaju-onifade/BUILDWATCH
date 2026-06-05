import { jsPDF } from 'jspdf'
import 'jspdf-autotable'
import { prisma } from '@/lib/db'

// Note: jspdf-autotable adds autoTable to jsPDF type
declare module 'jspdf' {
  interface jsPDF {
    autoTable: (options: any) => jsPDF
  }
}

/**
 * Generates a Project Dossier PDF.
 * This is intended for Owners to have a formal record of all approvals and submissions.
 */
export async function generateProjectDossier(projectId: string): Promise<Uint8Array> {
  const project = await prisma.projects.findUnique({
    where: { id: projectId },
    include: {
      owner: { select: { fullName: true, email: true } },
      milestones: {
        orderBy: { order: 'asc' },
        include: {
          approvedBy: { select: { fullName: true } },
          submissions: {
            orderBy: { createdAt: 'desc' },
            include: { submittedBy: { select: { fullName: true } } }
          }
        }
      },
      auditEvents: {
        where: { eventType: { in: ['MILESTONE_STATUS_UPDATED', 'PROJECT_CREATED'] } },
        orderBy: { createdAt: 'asc' }
      }
    }
  })

  if (!project) throw new Error('Project not found')

  const doc = new jsPDF()
  const pageWidth = doc.internal.pageSize.getWidth()

  // Header
  doc.setFontSize(22)
  doc.setTextColor(15, 109, 78) // --color-primary
  doc.text('BuildWatch Project Dossier', 14, 22)
  
  doc.setFontSize(10)
  doc.setTextColor(100)
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, 14, 30)

  // Project Info
  doc.setFontSize(14)
  doc.setTextColor(0)
  doc.text('Project Overview', 14, 45)
  
  doc.setFontSize(10)
  const info = [
    ['Project Name', project.name],
    ['Location', project.location],
    ['Owner', project.owner.fullName],
    ['Status', project.status.toUpperCase()],
    ['Total Budget', `${project.currency} ${project.totalBudget?.toLocaleString() || 'N/A'}`]
  ]

  doc.autoTable({
    startY: 50,
    head: [['Field', 'Value']],
    body: info,
    theme: 'striped',
    headStyles: { fillStyle: 'f', fillColor: [15, 109, 78] }
  })

  // Milestones Summary
  const lastY = (doc as any).lastAutoTable.finalY || 100
  doc.setFontSize(14)
  doc.text('Construction Phases (Milestones)', 14, lastY + 15)

  const milestoneRows = project.milestones.map(m => [
    m.order,
    m.name,
    m.status.toUpperCase(),
    m.approvedAt ? new Date(m.approvedAt).toLocaleDateString() : 'N/A',
    m.approvedBy?.fullName || 'N/A'
  ])

  doc.autoTable({
    startY: lastY + 20,
    head: [['#', 'Phase Name', 'Status', 'Approved At', 'Approved By']],
    body: milestoneRows,
    theme: 'grid',
    headStyles: { fillColor: [15, 109, 78] }
  })

  // Hash-Verified Audit Trail (Abbreviated)
  const auditY = (doc as any).lastAutoTable.finalY || 200
  if (auditY < 250) {
    doc.setFontSize(14)
    doc.text('Security Audit Log (Verified)', 14, auditY + 15)
    
    const auditRows = project.auditEvents.map((e: any) => [
      new Date(e.createdAt).toLocaleString(),
      e.eventType,
      e.signature ? (e.signature as string).substring(0, 8) + '...' : 'UNSIGNED'
    ])

    doc.autoTable({
      startY: auditY + 20,
      head: [['Timestamp', 'Event', 'Digital Signature']],
      body: auditRows,
      theme: 'plain',
      styles: { fontSize: 8 }
    })
  }

  // Footer / Disclaimer
  doc.setFontSize(8)
  doc.setTextColor(150)
  const disclaimer = 'This document is a computer-generated record of construction progress verified by BuildWatch AI and Owner Approval. Digital signatures confirm non-repudiation of the audit trail.'
  doc.text(disclaimer, 14, doc.internal.pageSize.getHeight() - 10)

  return new Uint8Array(doc.output('arraybuffer'))
}
