import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding database...");

  // Create default users
  const hashedPassword = await bcrypt.hash("password123", 10);

  const staff1 = await prisma.user.upsert({
    where: { email: "staff@library.com" },
    update: {},
    create: {
      email: "staff@library.com",
      name: "Library Staff",
      password: hashedPassword,
      role: "STAFF",
    },
  });

  const staff2 = await prisma.user.upsert({
    where: { email: "staff2@library.com" },
    update: {},
    create: {
      email: "staff2@library.com",
      name: "Staff Member 2",
      password: hashedPassword,
      role: "STAFF",
    },
  });

  const librarian = await prisma.user.upsert({
    where: { email: "librarian@library.com" },
    update: {},
    create: {
      email: "librarian@library.com",
      name: "Head Librarian",
      password: hashedPassword,
      role: "LIBRARIAN",
    },
  });

  const display = await prisma.user.upsert({
    where: { email: "display@library.com" },
    update: {},
    create: {
      email: "display@library.com",
      name: "Display Screen",
      password: hashedPassword,
      role: "DISPLAY",
    },
  });

  console.log("✅ Created users:");
  console.log(`   Staff: ${staff1.email} (password: password123)`);
  console.log(`   Staff: ${staff2.email} (password: password123)`);
  console.log(`   Librarian: ${librarian.email} (password: password123)`);
  console.log(`   Display: ${display.email} (password: password123)`);
  console.log("");
  console.log("🎉 Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
