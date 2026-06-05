import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateMilestoneStatus } from './updateMilestoneStatus'
import { prismaMock } from '@/test/prismaMock'

vi.mock('../../notifications/lib/dispatch', () => ({
  sendVerificationReceipt: vi.fn().mockResolvedValue({ ok: true }),
}))

describe('updateMilestoneStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  it('updates status and signs audit event', async () => {
    const mockDate = new Date('2026-06-05T12:00:00Z')
    vi.setSystemTime(mockDate)

    prismaMock.milestones.findUniqueOrThrow.mockResolvedValue({
      id: 'ms_001',
      projectId: 'proj_001',
      name: 'Foundation',
      status: 'pending',
      order: 1,
    } as any)

    // Mock the transaction callback
    prismaMock.$transaction.mockImplementation(async (cb) => await cb(prismaMock))

    const result = await updateMilestoneStatus('ms_001', 'in_progress', 'owner_001')

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

  it('automatically unlocks next milestone on approval', async () => {
    prismaMock.milestones.findUniqueOrThrow.mockResolvedValue({
      id: 'ms_001',
      projectId: 'proj_001',
      name: 'Foundation',
      status: 'under_review',
      order: 1,
    } as any)

    prismaMock.milestones.findFirst.mockResolvedValue({
      id: 'ms_002',
      name: 'Walling',
      order: 2,
    } as any)

    prismaMock.$transaction.mockImplementation(async (cb) => await cb(prismaMock))

    const result = await updateMilestoneStatus('ms_001', 'approved', 'owner_001')

    expect(result.ok).toBe(true)
    expect(prismaMock.milestones.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'ms_002' },
      data: { status: 'pending' }
    }))
  })
})
