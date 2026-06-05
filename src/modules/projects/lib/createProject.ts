import { prisma } from '@/lib/db'
import { ok, err, type Result } from '@/lib/result'
import { logger } from '@/lib/logger'
import { CreateProjectInput } from '../types'
import { NIGERIAN_RESIDENTIAL_TEMPLATE } from './templates'

export async function createProject(ownerId: string, input: CreateProjectInput): Promise<Result<{ projectId: string }>> {
  try {
    const { project } = await prisma.$transaction(async tx => {
      // Create Project
      const project = await tx.projects.create({
        data: {
          ownerId,
          name: input.name,
          location: input.location,
          buildType: input.buildType,
          totalBudget: input.totalBudget,
          currency: input.currency ?? 'NGN',
          status: 'active',
        },
      })

      // Add owner as a member with 'owner' role for UI ease (though logic checks Projects.ownerId usually, it's nice to have members consistent)
      // Actually, rule states: "owner is stored on Project directly", projectMembers is for proxy/contractor.
      // So no need to add owner to projectMembers table.
      
      // Auto-populate Milestones using the Nigerian Residential Template
      const milestonesData = NIGERIAN_RESIDENTIAL_TEMPLATE.map(m => ({
        projectId: project.id,
        name: m.name,
        order: m.order,
        status: 'pending',
      }))
      
      await tx.milestones.createMany({
        data: milestonesData
      })

      // Audit Log
      await tx.auditEvents.create({
        data: {
          eventType: 'PROJECT_CREATED',
          actorId: ownerId,
          resourceId: project.id,
          resourceType: 'project',
          projectId: project.id,
        },
      })

      return { project }
    })

    return ok({ projectId: project.id })
  } catch (error) {
    logger.error('Failed to create project', { module: 'projects', error: { message: (error as Error).message } })
    return err('Failed to create project', 'INTERNAL_ERROR')
  }
}
