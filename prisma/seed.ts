import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database (fresh slate)...');

  const accounts = [
    { name: 'Admin', email: 'admin@admitsonly.com', password: 'Admin@2024', role: 'admin' },
    { name: 'Maya Johnson', email: 'maya@beta.admitsonly.com', password: 'Beta@2026', role: 'student' },
    { name: 'Aisha Patel', email: 'aisha@beta.admitsonly.com', password: 'Beta@2026', role: 'student' },
    { name: 'James Williams', email: 'james@beta.admitsonly.com', password: 'Beta@2026', role: 'student' },
    { name: 'Robert Chen', email: 'robert@beta.admitsonly.com', password: 'Beta@2026', role: 'parent' },
  ];

  for (const acct of accounts) {
    const existing = await prisma.user.findUnique({ where: { email: acct.email } });

    if (existing) {
      // Wipe associated data for a fresh slate
      await prisma.essay.deleteMany({ where: { userId: existing.id } });
      await prisma.studentProfile.deleteMany({ where: { userId: existing.id } });
      // Reset user fields
      await prisma.user.update({
        where: { email: acct.email },
        data: {
          name: acct.name,
          password: await hash(acct.password, 12),
          role: acct.role,
        },
      });
      console.log(`  Reset ${acct.email} to fresh slate`);
    } else {
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
  }

  console.log('Seeding complete — all demo accounts are fresh.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
