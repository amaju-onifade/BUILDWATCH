const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const user = await prisma.users.findFirst({ where: { role: 'owner' } })
  if (!user) {
    console.log('No owner user found. Please register a user first.')
    return
  }

  const project = await prisma.projects.create({
    data: {
      ownerId: user.id,
      name: 'Lagos Family Home',
      location: 'Lekki Phase 1',
      buildType: 'Residential',
      totalBudget: 25000000,
      currency: 'NGN',
      status: 'active',
      milestones: {
        create: [
          { name: 'Site Preparation', order: 1, status: 'approved', tranche1Expected: 1000000, tranche1Actual: 1000000 },
          { name: 'Foundation', order: 2, status: 'approved', tranche1Expected: 5000000, tranche1Actual: 5000000 },
          { name: 'Ground Floor Columns', order: 3, status: 'under_review', tranche1Expected: 3000000 },
          { name: 'First Floor Slab', order: 4, status: 'pending', tranche1Expected: 8000000 },
        ]
      }
    }
  })

  console.log(`Seed complete. Project ID: ${project.id}`)
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect())
