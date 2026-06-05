import { z } from 'zod'

export const MILESTONE_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  UNDER_REVIEW: 'under_review',
  APPROVED: 'approved',
  LOCKED: 'locked',
} as const
export type MilestoneStatus = typeof MILESTONE_STATUS[keyof typeof MILESTONE_STATUS]

export const PAYMENT_SCHEDULE_TYPE = {
  SINGLE: 'single',
  TRANCHE3: 'tranche3',
} as const
export type PaymentScheduleType = typeof PAYMENT_SCHEDULE_TYPE[keyof typeof PAYMENT_SCHEDULE_TYPE]

export const UpdateMilestoneBudgetSchema = z.object({
  plannedCostTotal: z.number().min(0),
  paymentScheduleType: z.enum(['single', 'tranche3']).default('single'),
  tranche1Planned: z.number().min(0).optional(),
  tranche2Planned: z.number().min(0).optional(),
  tranche3Planned: z.number().min(0).optional(),
})

export type UpdateMilestoneBudgetInput = z.infer<typeof UpdateMilestoneBudgetSchema>

export type MilestoneRow = {
  id: string
  name: string
  order: number
  status: MilestoneStatus
  plannedCostTotal: number | null
  paymentScheduleType: string
  tranche1Planned: number | null
  tranche2Planned: number | null
  tranche3Planned: number | null
  currency: string
  startDate: Date | null
  completedAt: Date | null
  approvedAt: Date | null
}
