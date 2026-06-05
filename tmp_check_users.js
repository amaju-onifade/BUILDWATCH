require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const users = await prisma.users.findMany({
    select: { email: true, role: true }
  });
  
  const pgUsers = await prisma.users.findMany({
    where: { role: 'proxy' },
    select: { email: true }
  });

  console.log('--- ALL REGISTERED USERS ---');
  if (users.length === 0) {
    console.log('No users found in database.');
  } else {
    users.forEach(u => console.log(`- ${u.email} (${u.role})`));
  }
  console.log('----------------------------');
  
  if (pgUsers.length > 0) {
    console.log('\n✅ Proxy users exist!');
  } else {
    console.log('\n❌ No proxy users found.');
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
