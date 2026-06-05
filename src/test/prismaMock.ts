import { PrismaClient } from '@prisma/client'
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended'
import { vi, beforeEach } from 'vitest'
import { prisma } from '@/lib/db'

vi.mock('@/lib/db', () => ({
  prisma: mockDeep<PrismaClient>(),
}))

export const prismaMock = prisma as DeepMockProxy<PrismaClient>

beforeEach(() => {
  mockReset(prismaMock)
})
