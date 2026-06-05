import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { generateInviteLink } from '@/modules/auth/lib/generateInvite'
import { deliverInviteByEmail, buildWhatsAppShareUrl } from '@/modules/auth/lib/deliverInvite'
import { prisma } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await requireRole(req, ['owner'])
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id: projectId } = await params

  const body = await req.json()
  const { email, role } = body

  if (!email || !role || !['proxy', 'contractor'].includes(role)) {
    return NextResponse.json({ error: 'Email and valid role (proxy or contractor) are required' }, { status: 400 })
  }

  const project = await prisma.projects.findFirst({
    where: { id: projectId, ownerId: session.userId },
    select: { name: true },
  })
  if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

  const result = await generateInviteLink({
    projectId,
    ownerUserId: session.userId,
    inviteeEmail: email,
    role: role as 'proxy' | 'contractor',
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error, code: result.code }, { status: 400 })
  }

  const inviteUrl = result.data

  // Best-effort email delivery (stub uses console.log)
  await deliverInviteByEmail({
    inviteUrl,
    inviteeEmail: email,
    projectName: project.name,
    role: role as 'proxy' | 'contractor',
    ownerName: '',
  })

  const whatsappUrl = buildWhatsAppShareUrl(inviteUrl, project.name)

  return NextResponse.json({ data: { inviteUrl, whatsappUrl } })
}
