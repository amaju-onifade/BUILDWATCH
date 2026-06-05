require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const submissions = await prisma.submissions.findMany({
    include: {
      photos: true,
      milestone: { select: { name: true } },
      submittedBy: { select: { fullName: true } }
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log('--- SUBMISSIONS IN DB ---');
  if (submissions.length === 0) {
    console.log('No submissions found.');
  } else {
    submissions.forEach(s => {
      console.log(`[${s.createdAt.toISOString()}] ${s.milestone.name} by ${s.submittedBy.fullName}`);
      console.log(`  Caption: ${s.caption || 'None'}`);
      console.log(`  Photos (${s.photos.length}):`);
      s.photos.forEach(p => console.log(`    - ${p.storageKey}`));
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
