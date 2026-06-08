import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { mockDeep } from 'vitest-mock-extended'
import { getMilestones } from './getMilestones'
import { prismaMock } from '@/test/prismaMock'

vi.mock('@/lib/db', () => ({
  prisma: mockDeep<PrismaClient>(),
}))

const MOCK_PROJECT = { id: 'proj_001' } as any
const MOCK_MILESTONES = [
  {
    id: 'ms_001',
    name: 'Site Clearance',
    order: 1,
    status: 'pending',
    plannedCostTotal: null,
    paymentScheduleType: 'single',
    tranche1Planned: null,
    tranche2Planned: null,
    tranche3Planned: null,
    currency: 'NGN',
    startDate: null,
    completedAt: null,
    approvedAt: null,
  },
]

describe('getMilestones', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns ordered milestones when owner is confirmed', async () => {
    prismaMock.projects.findFirst.mockResolvedValueOnce(MOCK_PROJECT)
    prismaMock.milestones.findMany.mockResolvedValueOnce(MOCK_MILESTONES as any)

    const result = await getMilestones('proj_001', 'owner_001')

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.data).toHaveLength(1)
      expect(result.data[0].name).toBe('Site Clearance')
    }
    expect(prismaMock.projects.findFirst).toHaveBeenCalledWith({
      where: { id: 'proj_001', ownerId: 'owner_001' },
      select: { id: true },
    })
  })

  it('returns FORBIDDEN when project does not belong to the requesting user', async () => {
    prismaMock.projects.findFirst.mockResolvedValueOnce(null)

    const result = await getMilestones('proj_001', 'other_user')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('FORBIDDEN')
    }
    expect(prismaMock.milestones.findMany).not.toHaveBeenCalled()
  })

  it('returns INTERNAL_ERROR when the database throws', async () => {
    prismaMock.projects.findFirst.mockRejectedValueOnce(new Error('Connection refused'))

    const result = await getMilestones('proj_001', 'owner_001')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.code).toBe('INTERNAL_ERROR')
    }
  })
})
