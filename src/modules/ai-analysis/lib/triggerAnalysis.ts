import { logger } from '@/lib/logger'
import { prisma } from '@/lib/db'
import { getDownloadUrl } from '../../submissions/lib/storage'
import { analyzeSubmissionPhotos } from './deepseek'
import { saveAIReport } from './saveReport'

/**
 * Triggers the AI analysis workflow for a new submission.
 * This should be called fire-and-forget or via a background job.
 */
export async function triggerAIAnalysis(submissionId: string) {
  try {
    // 1. Fetch submission with milestones, photo keys, and project address fields
    const submission = await prisma.submissions.findUnique({
      where: { id: submissionId },
      include: {
        milestone: true,
        photos: true,
        project: {
          select: {
            streetNumber: true,
            streetName: true,
            lga: true,
            state: true,
            location: true,
            googleMapsPin: true,
          }
        }
      }
    })

    if (!submission) {
      logger.error('Cannot trigger AI analysis: submission not found', { submissionId })
      return
    }

    // 2. Build site address context for the AI prompt
    const p = submission.project
    const siteAddress = [
      [p.streetNumber, p.streetName].filter(Boolean).join(' '),
      p.lga,
      p.state,
    ].filter(Boolean).join(', ') || p.location

    // 3. Generate signed download URLs for each photo
    const photoUrls = await Promise.all(
      submission.photos.map(p => getDownloadUrl(p.storageKey))
    )

    // 4. Perform analysis (handles its own retries)
    const result = await analyzeSubmissionPhotos(
      submissionId,
      submission.milestone.name,
      photoUrls,
      submission.caption || undefined,
      siteAddress,
      p.googleMapsPin,
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
