
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { checkHeartbeatSilence, compileWeeklyDigest } from './dispatch'
import { prisma } from '@/lib/db'
import { sendEmail } from './sendEmail'

vi.mock('@/lib/db', () => ({
  prisma: {
    projects: {
      findMany: vi.fn(),
    },
    users: {
      findMany: vi.fn(),
    },
  },
}))

vi.mock('./sendEmail', () => ({
  sendEmail: vi.fn(),
}))

vi.mock('./emailTemplates', () => ({
  submissionReceivedEmail: vi.fn(),
  milestoneApprovedEmail: vi.fn(),
  silenceAlertEmail: vi.fn(() => 'Mock Email Body'),
  weeklyDigestEmail: vi.fn(() => 'Mock Digest Body'),
}))

vi.mock('@/lib/config', () => ({
  config: {
    appUrl: 'http://localhost:3000',
  },
}))

describe('checkHeartbeatSilence', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.setSystemTime(new Date('2026-06-05T12:00:00Z'))
  })

  it('sends an alert if a project has no submissions for more than 3 days', async () => {
    const mockLastSubmissionDate = new Date('2026-06-01T12:00:00Z') // 4 days ago
    
    ;(prisma.projects.findMany as any).mockResolvedValue([
      {
        id: 'proj_1',
        name: 'Silent Project',
        status: 'active',
        owner: { email: 'owner@example.com', fullName: 'John Doe' },
        submissions: [
          { createdAt: mockLastSubmissionDate }
        ]
      }
    ])

    await checkHeartbeatSilence()

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'owner@example.com',
      subject: expect.stringContaining('No updates in 4 days'),
    }))
  })

  it('does not send an alert if a project had a recent submission', async () => {
    const mockLastSubmissionDate = new Date('2026-06-04T12:00:00Z') // 1 day ago
    
    ;(prisma.projects.findMany as any).mockResolvedValue([
      {
        id: 'proj_2',
        name: 'Active Project',
        status: 'active',
        owner: { email: 'owner2@example.com', fullName: 'Jane Doe' },
        submissions: [
          { createdAt: mockLastSubmissionDate }
        ]
      }
    ])

    await checkHeartbeatSilence()

    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('sends an alert if a project has no submissions at all', async () => {
    ;(prisma.projects.findMany as any).mockResolvedValue([
      {
        id: 'proj_3',
        name: 'New Project',
        status: 'active',
        owner: { email: 'owner3@example.com', fullName: 'Bob Smith' },
        submissions: []
      }
    ])

    await checkHeartbeatSilence()

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'owner3@example.com',
      subject: expect.stringContaining('No updates in 14 days'),
    }))
  })
})

describe('compileWeeklyDigest', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.setSystemTime(new Date('2026-06-08T09:00:00Z')) // A Monday
  })

  it('compiles and sends a digest to owners with active projects', async () => {
    const mockSubmissionDate = new Date('2026-06-05T12:00:00Z') // Last Friday
    
    ;(prisma.users.findMany as any).mockResolvedValue([
      {
        id: 'owner_1',
        email: 'owner@example.com',
        fullName: 'John Owner',
        projectsOwned: [
          {
            id: 'proj_1',
            name: 'Project A',
            submissions: [{ createdAt: mockSubmissionDate, milestone: { name: 'Phase 1' } }],
            milestones: [{ approvedAt: mockSubmissionDate }]
          }
        ]
      }
    ])

    await compileWeeklyDigest()

    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({
      to: 'owner@example.com',
      subject: 'Your Weekly BuildWatch Digest',
    }))
  })

  it('skips owners with no active projects', async () => {
    ;(prisma.users.findMany as any).mockResolvedValue([
      {
        id: 'owner_2',
        email: 'owner2@example.com',
        fullName: 'Jane Owner',
        projectsOwned: []
      }
    ])

    await compileWeeklyDigest()

    expect(sendEmail).not.toHaveBeenCalled()
  })
})
