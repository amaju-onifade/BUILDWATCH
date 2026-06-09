import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { handleCreateProject } from '@/modules/projects/api/create'

export async function GET(req: NextRequest) {
  const session = await requireRole(req, ['owner'])
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const projects = await prisma.projects.findMany({
    where: { ownerId: session.userId },
    select: { id: true, name: true },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json({ data: projects })
}

export async function POST(req: NextRequest) {
  const session = await requireRole(req, ['owner'])
  if (!session) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  return handleCreateProject(req, session)
}
