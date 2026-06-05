import { ProjectContextBar } from '@/components/ProjectContextBar'
import { getSession } from '@/lib/auth'
import { prisma } from '@/lib/db'

type Props = {
  params: Promise<{ id: string }>
}

export default async function ProjectContextSlot({ params }: Props) {
  const { id } = await params
  const session = await getSession()
  if (!session) return null

  const project = await prisma.projects.findFirst({
    where: { id, ownerId: session.userId },
    select: { name: true, location: true },
  })
  if (!project) return null

  return <ProjectContextBar name={project.name} location={project.location} />
}
