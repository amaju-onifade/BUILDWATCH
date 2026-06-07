require('dotenv').config({ path: '.env.local' })
const { PrismaClient } = require('@prisma/client')
const { PrismaPg } = require('@prisma/adapter-pg')

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const prisma = new PrismaClient({ adapter })

async function main() {
  const user = await prisma.users.findFirst({ where: { role: 'owner' } })
  if (!user) {
    console.log('No owner found. Register first.')
    return
  }

  // Check if project already exists
  const existing = await prisma.projects.findFirst({ where: { ownerId: user.id } })
  if (existing) {
    console.log(`Project "${existing.name}" already exists. Approving milestones for progress bars...`)
    const updated = await prisma.milestones.updateMany({
      where: { projectId: existing.id, status: { notIn: ['approved', 'locked'] } },
      data: { status: 'approved' },
    })
    console.log(`Approved ${updated.count} milestones.`)
    console.log(`→ See progress bars at http://localhost:3000/dashboard`)
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
          { name: 'Site Preparation', order: 1, status: 'approved', plannedCostTotal: 1000000, currency: 'NGN' },
          { name: 'Foundation', order: 2, status: 'approved', plannedCostTotal: 5000000, currency: 'NGN' },
          { name: 'Ground Floor Columns', order: 3, status: 'under_review', plannedCostTotal: 3000000, currency: 'NGN' },
          { name: 'First Floor Slab', order: 4, status: 'in_progress', plannedCostTotal: 8000000, currency: 'NGN' },
          { name: 'Walling', order: 5, status: 'pending', plannedCostTotal: 3000000, currency: 'NGN' },
          { name: 'Roofing', order: 6, status: 'pending', plannedCostTotal: 2000000, currency: 'NGN' },
          { name: 'Plumbing & Electrical', order: 7, status: 'pending', plannedCostTotal: 1500000, currency: 'NGN' },
          { name: 'Plastering & Flooring', order: 8, status: 'pending', plannedCostTotal: 1000000, currency: 'NGN' },
          { name: 'Carcass Joinery', order: 9, status: 'pending', plannedCostTotal: 500000, currency: 'NGN' },
          { name: 'Finishing Joinery', order: 10, status: 'pending', plannedCostTotal: 500000, currency: 'NGN' },
          { name: 'Painting & Decorating', order: 11, status: 'pending', plannedCostTotal: 500000, currency: 'NGN' },
          { name: 'Completion', order: 12, status: 'pending', plannedCostTotal: 500000, currency: 'NGN' },
        ],
      },
    },
  })

  console.log(`Project "${project.name}" created with 12 milestones (2 approved).`)
  console.log(`→ Dashboard: http://localhost:3000/dashboard`)
  console.log(`→ Configure budgets: http://localhost:3000/projects/${project.id}/milestones`)
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect())
