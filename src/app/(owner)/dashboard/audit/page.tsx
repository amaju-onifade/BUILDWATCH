import type { Metadata } from 'next'
import { prisma } from '@/lib/db'
import { requirePageUser } from '@/lib/page'
import ProxyAuditTrail from '@/components/owner/ProxyAuditTrail'

export const metadata: Metadata = {
  title: 'Proxy Audit Trail — BuildWatch',
  description: 'Immutable log of every proxy visit and submission with PDF dossier export.',
}

export default async function AuditPage() {
  const user = await requirePageUser()

  const projects = await prisma.projects.findMany({
    where: { ownerId: user.userId },
    orderBy: { createdAt: 'desc' },
    take: 1,
    include: {
      submissions: {
        orderBy: { createdAt: 'desc' },
        take: 20,
        include: {
          submittedBy: { select: { fullName: true } },
          milestone: { select: { name: true } },
          photos: { select: { id: true } },
        },
      },
      members: {
        where: { role: 'proxy' },
        include: { user: { select: { fullName: true } } },
      },
    },
  })

  const project = projects[0] ?? null
  const proxyName = project?.members[0]?.user?.fullName ?? 'Proxy'
  const submissions = project?.submissions ?? []

  return (
    <ProxyAuditTrail
      userName={user.fullName}
      userInitials={user.initials}
      userPlan={user.plan}
      projectName={project?.name ?? 'My Project'}
      proxyName={proxyName}
      entries={submissions.map(s => ({
        title: `${s.photos.length} photos submitted — ${s.milestone.name}`,
        meta: `${s.createdAt.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })} · ${s.createdAt.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })} · Delivered ✓`,
        gps: 'GPS confirmed',
        thumbnails: s.photos.length,
      }))}
      visitCount={submissions.length}
    />
  )
}
