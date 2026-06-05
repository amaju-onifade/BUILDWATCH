require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const email = 'proxy@example.com';
  const password = 'password123';
  const hash = await bcrypt.hash(password, 12);
  
  const user = await prisma.users.upsert({
    where: { email },
    update: { passwordHash: hash, role: 'proxy' },
    create: {
      email,
      passwordHash: hash,
      fullName: 'Test Proxy',
      role: 'proxy'
    }
  });

  console.log(`✅ User ${email} updated/created with password: ${password}`);
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
