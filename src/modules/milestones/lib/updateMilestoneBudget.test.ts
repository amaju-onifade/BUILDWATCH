import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateMilestoneBudget } from './updateMilestoneBudget'
import { prismaMock } from '@/test/prismaMock'

const MOCK_MILESTONE = {
  id: 'ms_001',
  projectId: 'proj_001',
  name: 'Foundation',
  project: { ownerId: 'owner_001' },
} as any

const VALID_INPUT = {
  plannedCostTotal: 3_000_000,
  paymentScheduleType: 'single' as const,
}

describe('updateMilestoneBudget', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('updates budget and writes audit event in a transaction', async () => {
    prismaMock.milestones.findFirst.mockResolvedValueOnce(MOCK_MILESTONE)
    prismaMock.milestones.findUniqueOrThrow.mockResolvedValueOnce({ status: 'in_progress' } as any)
    prismaMock.$transaction.mockResolvedValueOnce([{}, {}])

    const result = await updateMilestoneBudget('ms_001', VALID_INPUT, 'owner_001')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.milestoneId).toBe('ms_001')
    }
    expect(prismaMock.$transaction).toHaveBeenCalledOnce()
  })

  it('returns FORBIDDEN when the milestone project is not owned by requester', async () => {
    prismaMock.milestones.findFirst.mockResolvedValueOnce({
      ...MOCK_MILESTONE,
      project: { ownerId: 'different_owner' },
    })

    const result = await updateMilestoneBudget('ms_001', VALID_INPUT, 'owner_001')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('FORBIDDEN')
    }
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('returns FORBIDDEN when the milestone does not exist', async () => {
    prismaMock.milestones.findFirst.mockResolvedValueOnce(null)

    const result = await updateMilestoneBudget('ms_999', VALID_INPUT, 'owner_001')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('FORBIDDEN')
    }
  })

  it('returns MILESTONE_LOCKED when status is approved', async () => {
    prismaMock.milestones.findFirst.mockResolvedValueOnce(MOCK_MILESTONE)
    prismaMock.milestones.findUniqueOrThrow.mockResolvedValueOnce({ status: 'approved' } as any)

    const result = await updateMilestoneBudget('ms_001', VALID_INPUT, 'owner_001')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('MILESTONE_LOCKED')
    }
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('returns MILESTONE_LOCKED when status is locked', async () => {
    prismaMock.milestones.findFirst.mockResolvedValueOnce(MOCK_MILESTONE)
    prismaMock.milestones.findUniqueOrThrow.mockResolvedValueOnce({ status: 'locked' } as any)

    const result = await updateMilestoneBudget('ms_001', VALID_INPUT, 'owner_001')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('MILESTONE_LOCKED')
    }
  })

  it('returns INTERNAL_ERROR when database throws unexpectedly', async () => {
    prismaMock.milestones.findFirst.mockRejectedValueOnce(new Error('Timeout'))

    const result = await updateMilestoneBudget('ms_001', VALID_INPUT, 'owner_001')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL_ERROR')
    }
  })
})
