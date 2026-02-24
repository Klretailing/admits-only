import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  const accounts = [
    { name: 'Admin', email: 'admin@admitsonly.com', password: 'Admin@2024', role: 'admin' },
    { name: 'Maya Johnson', email: 'maya@beta.admitsonly.com', password: 'Beta@2026', role: 'student' },
    { name: 'Aisha Patel', email: 'aisha@beta.admitsonly.com', password: 'Beta@2026', role: 'student' },
    { name: 'James Williams', email: 'james@beta.admitsonly.com', password: 'Beta@2026', role: 'student' },
    { name: 'Robert Chen', email: 'robert@beta.admitsonly.com', password: 'Beta@2026', role: 'parent' },
  ];

  for (const acct of accounts) {
    const exists = await prisma.user.findUnique({ where: { email: acct.email } });
    if (exists) {
      console.log(`  Skipping ${acct.email} (already exists)`);
      continue;
    }

    await prisma.user.create({
      data: {
        name: acct.name,
        email: acct.email,
        password: await hash(acct.password, 12),
        role: acct.role,
      },
    });
    console.log(`  Created ${acct.role}: ${acct.email}`);
  }

  console.log('Seeding complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
