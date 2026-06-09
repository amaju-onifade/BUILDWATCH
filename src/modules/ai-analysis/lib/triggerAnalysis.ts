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
    // 1. Fetch submission with milestones, photo keys, and project details
    const submission = await prisma.submissions.findUnique({
      where: { id: submissionId },
      include: {
        milestone: true,
        photos: true,
        project: {
          include: {
            milestones: {
              orderBy: { order: 'asc' },
              where: { status: 'approved' },
              select: { name: true, order: true },
            },
          },
        },
      },
    })

    if (!submission) {
      logger.error('Cannot trigger AI analysis: submission not found', { submissionId })
      return
    }

    // 2. Build context fields
    const p = submission.project
    const siteAddress = [
      [p.streetNumber, p.streetName].filter(Boolean).join(' '),
      p.lga,
      p.state,
    ].filter(Boolean).join(', ') || p.location

    const phaseHistory = (p as any).milestones
      .map((m: { order: number; name: string }) => `Phase ${m.order} — ${m.name}`)
      .join(', ') || 'None'

    const submissionDate = submission.createdAt.toLocaleDateString('en-GB', {
      day: 'numeric', month: 'long', year: 'numeric',
    })

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
      p.name,
      phaseHistory,
      submissionDate,
      undefined, // referenceSummary — populated when R2 stores reference files
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
