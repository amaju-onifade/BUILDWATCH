import { nanoid } from 'nanoid'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { logger } from '@/lib/logger'
import { encrypt } from '@/lib/encryption'
import { CreateSubmissionSchema } from '../types'
import { analyzeSubmission } from '../../ai-analysis/lib/analyzeSubmission'
import type { SessionUser } from '@/lib/auth'

/**
 * Handle submission creation (API entry point).
 * Ownership axis check: requester must be a member of the project with role 'proxy' or 'contractor'.
 */
export async function handleCreateSubmission(
  req: NextRequest,
  session: SessionUser
): Promise<NextResponse> {
  const requestId = nanoid(10)

  try {
    const body = await req.json()
    const result = CreateSubmissionSchema.safeParse(body)

    if (!result.success) {
      return NextResponse.json(
        { error: 'Validation failed', code: 'VALIDATION_ERROR', issues: result.error.issues },
        { status: 400 }
      )
    }

    const { milestoneId, projectId, photos, caption, geoLat, geoLng } = result.data

    // Verify ownership/membership
    const membership = await prisma.projectMembers.findFirst({
      where: {
        projectId,
        userId: session.userId,
        role: { in: ['proxy', 'contractor'] },
      },
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Forbidden — No access to this project', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Verify milestone belongs to project
    const milestone = await prisma.milestones.findFirst({
      where: { id: milestoneId, projectId },
    })

    if (!milestone) {
      return NextResponse.json(
        { error: 'Forbidden — Milestone does not belong to project', code: 'FORBIDDEN' },
        { status: 403 }
      )
    }

    // Create submission and audit event atomically
    const submission = await prisma.$transaction(async (tx) => {
      const s = await tx.submissions.create({
        data: {
          id: nanoid(),
          milestoneId,
          projectId,
          submittedById: session.userId,
          status: 'delivered',
          caption,
          // Store coordinates encrypted at rest (Step 7 requirement)
          geoLat: geoLat ? encrypt(geoLat.toString()) : undefined,
          geoLng: geoLng ? encrypt(geoLng.toString()) : undefined,
          geoAvailable: !!(geoLat && geoLng),
        },
      })

      // Add photos
      if (photos.length > 0) {
        await tx.submissionPhotos.createMany({
          data: photos.map((key) => ({
            id: nanoid(),
            submissionId: s.id,
            storageKey: key,
            sizeBytes: 0, // Placeholder
            compressedSizeBytes: 0, // Placeholder
          })),
        })
      }

      // Write audit event
      await tx.auditEvents.create({
        data: {
          id: nanoid(),
          actorId: session.userId,
          projectId,
          eventType: 'SUBMISSION_CREATED',
          resourceId: s.id,
          resourceType: 'submission',
          metadata: {
            milestoneId,
            photoCount: photos.length,
          },
        },
      })

      // Tier 2: Transition milestone to 'under_review'
      await tx.milestones.update({
        where: { id: milestoneId },
        data: { status: 'under_review' },
      })

      return s
    })

    // Tier 2: Fire-and-forget AI analysis
    analyzeSubmission(submission.id).catch(err => {
      logger.error('AI analysis background job failed to start', {
        submissionId: submission.id,
        error: { message: err.message }
      })
    })

    logger.info('Submission created', {
      module: 'submissions',
      userId: session.userId,
      projectId,
      submissionId: submission.id,
      requestId,
    })

    return NextResponse.json({ data: { id: submission.id } }, { status: 201 })

  } catch (err) {
    logger.error('Unhandled error in handleCreateSubmission', {
      module: 'submissions',
      requestId,
      userId: session.userId,
      error: { message: (err as Error).message, stack: (err as Error).stack },
    })

    return NextResponse.json(
      { error: 'Something went wrong', requestId },
      { status: 500 }
    )
  }
}
