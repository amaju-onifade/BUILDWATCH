import type { DeepMockProxy } from 'vitest-mock-extended'
import { mockReset } from 'vitest-mock-extended'
import { beforeEach } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { prisma } from '@/lib/db'

export const prismaMock = prisma as unknown as DeepMockProxy<PrismaClient>

beforeEach(() => {
  mockReset(prismaMock)
})
