import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { mockDeep } from 'vitest-mock-extended'
import { updateMilestoneBudget } from './updateMilestoneBudget'
import { prismaMock } from '@/test/prismaMock'

vi.mock('@/lib/db', () => ({
  prisma: mockDeep<PrismaClient>(),
}))

const MOCK_MILESTONE = {
  id: 'ms_001',
  projectId: 'proj_001',
  name: 'Foundation',
  status: 'pending',
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
    prismaMock.milestones.findFirst.mockResolvedValue(MOCK_MILESTONE)
    
    // Mock the callback form of $transaction
    prismaMock.$transaction.mockImplementation(async (cb) => await cb(prismaMock))

    const result = await updateMilestoneBudget('ms_001', VALID_INPUT, 'owner_001')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data.milestoneId).toBe('ms_001')
    }
    expect(prismaMock.milestones.update).toHaveBeenCalledOnce()
    expect(prismaMock.auditEvents.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventType: 'MILESTONE_BUDGET_UPDATED',
        signature: expect.any(String)
      })
    }))
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
    prismaMock.milestones.findFirst.mockResolvedValueOnce({ ...MOCK_MILESTONE, status: 'approved' })

    const result = await updateMilestoneBudget('ms_001', VALID_INPUT, 'owner_001')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('MILESTONE_LOCKED')
    }
    expect(prismaMock.$transaction).not.toHaveBeenCalled()
  })

  it('returns MILESTONE_LOCKED when status is locked', async () => {
    prismaMock.milestones.findFirst.mockResolvedValueOnce({ ...MOCK_MILESTONE, status: 'locked' })

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
