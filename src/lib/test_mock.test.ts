import { describe, it, expect, vi } from 'vitest'
import { prisma } from './db'

vi.mock('./db', () => ({
  prisma: {
    users: {
      findUnique: vi.fn()
    }
  }
}))

describe('Mock test', () => {
  it('should use the mock', async () => {
    (prisma.users.findUnique as any).mockResolvedValue({ id: '1' })
    const user = await prisma.users.findUnique({ where: { id: '1' } })
    expect(user.id).toBe('1')
  })
})
