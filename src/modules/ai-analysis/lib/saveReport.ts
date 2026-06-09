import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import type { AIAnalysisResult } from './deepseek'

/**
 * Saves an AI report to the database.
 * Stores the full analysis JSON in observations and maps key fields for display.
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

    const overallConf = result?.overall_confidence ?? 0
    const photoQualityVal = result
      ? result.photo_quality_issues.length > 2 ? 'Low'
        : overallConf > 0.7 ? 'High'
        : 'Medium'
      : null

    await prisma.aIReports.create({
      data: {
        submissionId,
        projectId: submission.projectId,
        milestoneId: submission.milestoneId,
        status: result ? 'complete' : 'failed',
        overallAssessment: result?.scene_summary,
        progressIndicator: result?.stage_assessment_text,
        confidenceLevel: overallConf > 0.7 ? 'High' : overallConf > 0.4 ? 'Medium' : 'Low',
        observations: result as any,
        concerns: (result?.anomalies ?? []).map(a =>
          `[${a.severity.toUpperCase()}] ${a.description} — Ask: ${a.suggested_question}`
        ) as any,
        limitations: result?.cannot_assess as any,
        photoQuality: photoQualityVal,
        photoQualityNote: result?.photo_quality_issues.map(p => `Photo ${p.photo_index}: ${p.issue}`).join('; ') || null,
        recommendedOwnerAction: result
          ? (result.inspector_recommended ? 'Consider dispatching an inspector for a professional site assessment.' : 'Review the report and follow up with your proxy on any flagged items.')
          : null,
        modelUsed: 'deepseek-sonnet-4-20250514',
        generatedAt: new Date(),
      }
    })

    logger.info('AI report saved to database', { submissionId, status: result ? 'complete' : 'failed' })
  } catch (err) {
    logger.error('Failed to save AI report', {
      submissionId,
      error: (err as Error).message,
    })
    throw err
  }
}
