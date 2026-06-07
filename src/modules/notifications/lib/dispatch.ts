import { nanoid } from 'nanoid'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { sendEmail } from './sendEmail'
import { submissionReceivedEmail, milestoneApprovedEmail, silenceAlertEmail, weeklyDigestEmail, chaseProxyEmail } from './emailTemplates'
import { config } from '@/lib/config'

/**
 * Notify the project owner when a new submission arrives.
 * Checks if the AI report has flagged concerns.
 */
export async function notifyOwnerNewSubmission(submissionId: string): Promise<void> {
  try {
    const submission = await prisma.submissions.findUnique({
      where: { id: submissionId },
      include: {
        milestone: { select: { name: true } },
        submittedBy: { select: { fullName: true } },
        aiReport: { select: { concerns: true } },
        project: {
          include: {
            owner: { select: { email: true, fullName: true } },
          },
        },
      },
    })

    if (!submission) return

    const aiConcerns = submission.aiReport?.concerns
    const hasAiFlagged = Array.isArray(aiConcerns)
      ? aiConcerns.length > 0
      : !!aiConcerns

    const projectUrl = `${config.appUrl}/projects/${submission.projectId}`

    // 1. Send email to owner
    await sendEmail({
      to: submission.project.owner.email,
      subject: `New submission: ${submission.milestone.name} — ${submission.project.name}`,
      html: submissionReceivedEmail({
        ownerName: submission.project.owner.fullName,
        projectName: submission.project.name,
        milestoneName: submission.milestone.name,
        submitterName: submission.submittedBy.fullName,
        hasAiFlagged,
        projectUrl,
      }),
    })

    // 2. Write in-app notification
    await prisma.notifications.create({
      data: {
        id: nanoid(),
        userId: submission.project.ownerId,
        type: 'SUBMISSION_RECEIVED',
        title: `New submission: ${submission.milestone.name}`,
        body: `${submission.submittedBy.fullName} submitted progress photos.${hasAiFlagged ? ' AI flagged concerns.' : ''}`,
        relatedEntityId: submissionId,
        relatedEntityType: 'submission',
        channel: 'in_app',
      },
    })

    logger.info('Owner notified of new submission', {
      module: 'notifications',
      submissionId,
      ownerId: submission.project.ownerId,
    })
  } catch (err) {
    logger.error('Failed to notify owner of submission', {
      module: 'notifications',
      submissionId,
      error: { message: (err as Error).message },
    })
  }
}

/**
 * Notify contractors when a milestone is approved by the owner.
 */
export async function notifyContractorMilestoneApproved(
  milestoneId: string,
  projectId: string,
  approvedByName: string
): Promise<void> {
  try {
    const milestone = await prisma.milestones.findUnique({
      where: { id: milestoneId },
      select: { name: true, order: true },
    })
    if (!milestone) return

    // Find the next milestone
    const nextMilestone = await prisma.milestones.findFirst({
      where: { projectId, order: milestone.order + 1 },
      select: { name: true },
    })

    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      select: { name: true },
    })
    if (!project) return

    // Find contractor members
    const contractors = await prisma.projectMembers.findMany({
      where: { projectId, role: 'contractor' },
      include: { user: { select: { email: true, fullName: true } } },
    })

    const projectUrl = `${config.appUrl}/projects/${projectId}`

    for (const member of contractors) {
      await sendEmail({
        to: member.user.email,
        subject: `Milestone approved: ${milestone.name}`,
        html: milestoneApprovedEmail({
          contractorName: member.user.fullName,
          projectName: project.name,
          milestoneName: milestone.name,
          approvedByName,
          nextMilestoneName: nextMilestone?.name,
          projectUrl,
        }),
      })

      await prisma.notifications.create({
        data: {
          id: nanoid(),
          userId: member.userId,
          type: 'MILESTONE_APPROVED',
          title: `Milestone approved: ${milestone.name}`,
          body: `${approvedByName} has approved this phase. ${nextMilestone ? `Next: ${nextMilestone.name}` : ''}`,
          relatedEntityId: milestoneId,
          relatedEntityType: 'milestone',
          channel: 'in_app',
        },
      })
    }

    logger.info('Contractors notified of milestone approval', {
      module: 'notifications',
      milestoneId,
      contractorCount: contractors.length,
    })
  } catch (err) {
    logger.error('Failed to notify contractor of milestone approval', {
      module: 'notifications',
      milestoneId,
      error: { message: (err as Error).message },
    })
  }
}

/**
 * Check all projects for silence (no submissions in 3+ days) and alert owners.
 * This is designed to be called by a scheduled cron job.
 */
export async function checkHeartbeatSilence(): Promise<void> {
  try {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000)

    const activeProjects = await prisma.projects.findMany({
      where: { status: 'active' },
      include: {
        owner: { select: { email: true, fullName: true } },
        submissions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true },
        },
      },
    })

    for (const project of activeProjects) {
      const lastSubmission = project.submissions[0]

      if (!lastSubmission || lastSubmission.createdAt < threeDaysAgo) {
        const daysSince = lastSubmission
          ? Math.floor((Date.now() - lastSubmission.createdAt.getTime()) / (1000 * 60 * 60 * 24))
          : 14 // No submission ever

        await sendEmail({
          to: project.owner.email,
          subject: `⚠ No updates in ${daysSince} days — ${project.name}`,
          html: silenceAlertEmail({
            ownerName: project.owner.fullName,
            projectName: project.name,
            daysSinceLastSubmission: daysSince,
            projectUrl: `${config.appUrl}/projects/${project.id}`,
          }),
        })

        logger.info('Heartbeat silence alert sent', {
          module: 'notifications',
          projectId: project.id,
          daysSince,
        })
      }
    }
  } catch (err) {
    logger.error('Heartbeat silence check failed', {
      module: 'notifications',
      error: { message: (err as Error).message },
    })
  }
}

/**
 * Compile activities for all owners and send a weekly digest.
 * This is designed to be called by a scheduled cron job (e.g., every Monday 8 AM).
 */
export async function compileWeeklyDigest(): Promise<void> {
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    // 1. Fetch all owners with active projects
    const owners = await prisma.users.findMany({
      where: { role: 'owner', deletedAt: null },
      include: {
        projectsOwned: {
          where: { status: 'active' },
          include: {
            submissions: {
              where: { createdAt: { gte: sevenDaysAgo } },
              include: { milestone: { select: { name: true } } },
            },
            milestones: {
              where: { approvedAt: { gte: sevenDaysAgo } },
            },
          },
        },
      },
    })

    for (const owner of owners) {
      if (owner.projectsOwned.length === 0) continue

      let totalSubmissions = 0
      let totalApprovedMilestones = 0
      const projectDetails: string[] = []

      for (const project of owner.projectsOwned) {
        const subCount = project.submissions.length
        const appCount = project.milestones.length
        totalSubmissions += subCount
        totalApprovedMilestones += appCount

        if (subCount > 0 || appCount > 0) {
          projectDetails.push(
            `<strong>${project.name}</strong>: ${subCount} submissions, ${appCount} phases approved.`
          )
        } else {
          projectDetails.push(`<strong>${project.name}</strong>: No activity this week.`)
        }
      }

      // Only send if there are active projects or some activity occurred (optional: send always if has active projects)
      await sendEmail({
        to: owner.email,
        subject: `Your Weekly BuildWatch Digest`,
        html: weeklyDigestEmail({
          ownerName: owner.fullName,
          submissionsThisWeek: totalSubmissions,
          milestonesApprovedThisWeek: totalApprovedMilestones,
          activeProjectsCount: owner.projectsOwned.length,
          projectDetails,
          projectUrl: `${config.appUrl}/dashboard`,
        }),
      })

      logger.info('Weekly digest sent to owner', {
        module: 'notifications',
        ownerId: owner.id,
        projectCount: owner.projectsOwned.length,
      })
    }
  } catch (err) {
    logger.error('Weekly digest compilation failed', {
      module: 'notifications',
      error: { message: (err as Error).message },
    })
  }
}

/**
 * Manually trigger a "chase" notification to a project proxy.
 */
export async function sendChaseProxyNotification(
  projectId: string,
  ownerName: string
): Promise<void> {
  try {
    const project = await prisma.projects.findUnique({
      where: { id: projectId },
      include: {
        members: {
          where: { role: 'proxy' },
          include: { user: { select: { email: true, fullName: true, id: true } } },
        },
        milestones: {
          where: { status: 'in_progress' },
          orderBy: { order: 'asc' },
          take: 1,
        },
      },
    })

    if (!project || project.members.length === 0) return

    const currentMilestone = project.milestones[0] || { name: 'Current Phase' }
    const submissionUrl = `${config.appUrl}/field`

    for (const member of project.members) {
      await sendEmail({
        to: member.user.email,
        subject: `Reminder: Update requested for ${project.name}`,
        html: chaseProxyEmail({
          proxyName: member.user.fullName,
          ownerName,
          projectName: project.name,
          milestoneName: currentMilestone.name,
          submissionUrl,
        }),
      })

      await prisma.notifications.create({
        data: {
          id: nanoid(),
          userId: member.user.id,
          type: 'CHASE_PROXY',
          title: 'Update requested',
          body: `${ownerName} is requesting a progress update for ${project.name}.`,
          relatedEntityId: projectId,
          relatedEntityType: 'project',
          channel: 'in_app',
        },
      })
    }

    logger.info('Chase proxy notifications sent', {
      module: 'notifications',
      projectId,
      proxyCount: project.members.length,
    })
  } catch (err) {
    logger.error('Failed to send chase proxy notification', {
      module: 'notifications',
      projectId,
      error: { message: (err as Error).message },
    })
  }
}
