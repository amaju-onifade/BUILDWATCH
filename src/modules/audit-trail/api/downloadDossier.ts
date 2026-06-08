import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { generateProjectDossier } from '../lib/generateDossier'
import { logger } from '@/lib/logger'

export async function handleDownloadDossier(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getSession()
    if (!session || session.role !== 'owner') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const projectId = params.id

    const project = await prisma.projects.findFirst({
      where: { id: projectId, ownerId: session.userId },
      select: { id: true },
    })
    if (!project) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const pdfBuffer = await generateProjectDossier(projectId)

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="BuildWatch_Dossier_${projectId}.pdf"`,
      },
    })

  } catch (error) {
    logger.error('Failed to generate PDF dossier', {
      module: 'audit-trail',
      error: { message: (error as Error).message },
    })
    return NextResponse.json({ error: 'Failed to generate dossier' }, { status: 500 })
  }
}
