import { logger } from '@/lib/logger'
import { prisma } from '@/lib/db'
import { analyzeSubmissionPhotos } from './deepseek'
import { saveAIReport } from './saveReport'

/**
 * Triggers the AI analysis workflow for a new submission.
 * This should be called fire-and-forget or via a background job.
 */
export async function triggerAIAnalysis(submissionId: string) {
  try {
    // 1. Fetch submission with milestones and photo keys
    const submission = await prisma.submissions.findUnique({
      where: { id: submissionId },
      include: {
        milestone: true,
        photos: true,
      }
    })

    if (!submission) {
      logger.error('Cannot trigger AI analysis: submission not found', { submissionId })
      return
    }

    // 2. Prepare photo URLs (assuming public or presigned URLs)
    // NOTE: In production, these should be signed Cloudflare R2 URLs.
    const photoUrls = submission.photos.map(p => 
      `${process.env.NEXT_PUBLIC_APP_URL}/api/photos/${p.storageKey}`
    )

    // 3. Perform analysis (handles its own retries)
    const result = await analyzeSubmissionPhotos(
      submissionId,
      submission.milestone.name,
      photoUrls,
      submission.caption || undefined
    )

    // 4. Save results (success or failure)
    await saveAIReport(submissionId, result)

  } catch (err) {
    logger.error('Unhandled internal error in triggerAIAnalysis', {
      submissionId,
      error: (err as Error).message,
    })
    
    // Attempt to save a 'failed' report if possible
    try {
      await saveAIReport(submissionId, null)
    } catch {}
  }
}
