import { PrismaClient } from '@prisma/client'
import { hash } from 'bcrypt'

const prisma = new PrismaClient()

async function main() {
  const email = 'owner@test.com'
  const password = 'password123'
  const passwordHash = await hash(password, 12)

  const user = await prisma.users.upsert({
    where: { email },
    update: {},
    create: {
      email,
      passwordHash,
      fullName: 'Test Owner',
      role: 'owner',
    },
  })

  console.log('Seeded owner user:', user.email)

  const project = await prisma.projects.create({
    data: {
      name: 'Lagos Family Home',
      location: 'Lekki Phase 1',
      ownerId: user.id,
      buildType: 'Residential',
      totalBudget: 15000000,
      currency: 'NGN',
      milestones: {
        createMany: {
          data: [
            { name: 'Site Clearing', order: 1, status: 'approved' },
            { name: 'Foundation', order: 2, status: 'in_progress' },
            { name: 'Columns & Lintels', order: 3, status: 'pending' },
          ]
        }
      }
    }
  })

  console.log('Seeded project:', project.name)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
