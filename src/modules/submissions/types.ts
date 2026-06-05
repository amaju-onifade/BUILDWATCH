import { z } from 'zod'

export const SubmissionStatus = {
  PENDING: 'pending',
  UPLOADED: 'uploaded',
  FAILED: 'failed',
} as const

export type SubmissionStatus = typeof SubmissionStatus[keyof typeof SubmissionStatus]

export const CreateSubmissionSchema = z.object({
  milestoneId: z.string().cuid2(),
  projectId: z.string().cuid2(),
  caption: z.string().max(500).optional(),
  photos: z.array(z.string()).min(1).max(10), // Array of R2 storage keys
  geoLat: z.number().min(-90).max(90).optional(),
  geoLng: z.number().min(-180).max(180).optional(),
})

export type CreateSubmissionInput = z.infer<typeof CreateSubmissionSchema>

export type OfflineSubmission = {
  id: string
  milestoneId: string
  projectId: string
  caption?: string
  photos: Blob[] // Blobs to be uploaded
  geoLat?: number
  geoLng?: number
  timestamp: number
}
