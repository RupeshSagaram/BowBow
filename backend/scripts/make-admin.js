// make-admin.js — Promotes a user to admin by email address.
//
// Usage (from the backend/ directory):
//   node scripts/make-admin.js your@email.com

const { PrismaClient } = require('@prisma/client');
require('dotenv').config();

const prisma = new PrismaClient();
const email = process.argv[2];

async function main() {
  if (!email) {
    console.error('Usage: node scripts/make-admin.js your@email.com');
    process.exit(1);
  }

  const user = await prisma.user.update({
    where: { email },
    data: { isAdmin: true },
  });

  console.log(`✓ ${user.firstName} ${user.lastName} (${user.email}) is now an admin.`);
}

main()
  .catch((err) => {
    console.error('Error:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
