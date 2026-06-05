require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const reports = await prisma.aIReports.findMany({
    include: {
      submission: {
        include: {
          milestone: { select: { name: true } }
        }
      }
    },
    orderBy: { createdAt: 'desc' },
    take: 5
  });

  console.log('--- RECENT AI REPORTS ---');
  if (reports.length === 0) {
    console.log('No AI reports found.');
  } else {
    reports.forEach(r => {
      console.log(`[${r.createdAt.toISOString()}] Report for ${r.submission.milestone.name}`);
      console.log(`  Overall: ${r.overallAssessment}`);
      console.log(`  Observations: ${r.observations}`);
      console.log(`  Status: ${r.status}`);
    });
  }
  console.log('-------------------------');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
