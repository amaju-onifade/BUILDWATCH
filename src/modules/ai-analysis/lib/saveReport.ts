import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import type { AIAnalysisResult } from './deepseek'

/**
 * Saves an AI report to the database.
 */
export async function saveAIReport(
  submissionId: string,
  result: AIAnalysisResult | null
) {
  try {
    const submission = await prisma.submissions.findUnique({
      where: { id: submissionId },
      select: { projectId: true, milestoneId: true }
    })

    if (!submission) {
      throw new Error(`Submission ${submissionId} not found`)
    }

    await prisma.aIReports.create({
      data: {
        submissionId,
        projectId: submission.projectId,
        milestoneId: submission.milestoneId,
        status: result ? 'complete' : 'failed',
        overallAssessment: result?.overallAssessment,
        progressIndicator: result?.progressIndicator,
        observations: result?.observations as any,
        concerns: result?.concerns as any,
        photoQuality: result?.photoQuality,
        recommendedOwnerAction: result?.recommendedOwnerAction,
        modelUsed: 'deepseek-chat',
        generatedAt: new Date(),
      }
    })

    logger.info('AI report saved to database', { submissionId, status: result ? 'complete' : 'failed' })
  } catch (err) {
    logger.error('Failed to save AI report', {
      submissionId,
      error: (err as Error).message,
    })
    throw err // Allow parent to handle
  }
}
