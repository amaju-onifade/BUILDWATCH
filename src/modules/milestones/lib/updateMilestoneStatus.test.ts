import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { mockDeep } from 'vitest-mock-extended'
import { updateMilestoneStatus } from './updateMilestoneStatus'
import { prismaMock } from '@/test/prismaMock'

vi.mock('@/lib/db', () => ({
  prisma: mockDeep<PrismaClient>(),
}))

describe('updateMilestoneStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('updates status and signs audit event', async () => {
    const mockDate = new Date('2026-06-05T12:00:00Z')
    vi.setSystemTime(mockDate)

    prismaMock.milestones.findFirst.mockResolvedValue({
      id: 'ms_001',
      projectId: 'proj_001',
      name: 'Foundation',
      status: 'pending',
    } as any)

    prismaMock.milestones.update.mockResolvedValue({
      id: 'ms_001',
      status: 'in_progress',
    } as any)

    // Mock the transaction callback
    prismaMock.$transaction.mockImplementation(async (cb) => await cb(prismaMock))

    const result = await updateMilestoneStatus('ms_001', 'proj_001', 'owner_001', 'in_progress')

    expect(result.ok).toBe(true)
    expect(prismaMock.milestones.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'ms_001' },
      data: expect.objectContaining({ status: 'in_progress' })
    }))
    
    expect(prismaMock.auditEvents.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        eventType: 'MILESTONE_STATUS_UPDATED',
        signature: expect.any(String)
      })
    }))
  })
})
