require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const report = await prisma.aIReports.findFirst({
    orderBy: { createdAt: 'desc' },
    include: {
      submission: {
        include: { milestone: { select: { name: true } } }
      }
    }
  });

  if (!report) {
    console.log('No AI reports found.');
    return;
  }

  console.log('\n=== F-09 AI INSPECTION REPORT ===');
  console.log(`Submission:       ${report.submissionId}`);
  console.log(`Milestone:        ${report.submission.milestone.name}`);
  console.log(`Report Status:    ${report.status}`);
  console.log(`Generated At:     ${report.generatedAt}`);
  console.log(`Model Used:       ${report.modelUsed ?? 'N/A'}`);
  console.log('');
  console.log('--- S1. WHAT IS VISIBLE ---');
  console.log(report.overallAssessment ?? 'MISSING');
  console.log('');
  console.log('--- S2. STAGE ASSESSMENT ---');
  console.log(`Stage:      ${report.progressIndicator ?? 'MISSING'}`);
  console.log(`Confidence: ${report.confidenceLevel ?? 'MISSING'}`);
  console.log(`Quality:    ${report.photoQuality ?? 'MISSING'}`);
  console.log('');
  console.log('--- S3. ANOMALIES & CONCERNS ---');
  console.log(JSON.stringify(report.concerns, null, 2) ?? 'MISSING');
  console.log('');
  console.log('--- S4. MANDATORY LIMITATIONS ---');
  console.log(JSON.stringify(report.limitations, null, 2));
  console.log('');
  console.log('--- RECOMMENDED OWNER ACTION ---');
  console.log(report.recommendedOwnerAction ?? 'MISSING');
  console.log('=================================\n');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
