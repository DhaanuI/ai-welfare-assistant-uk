import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.STAFF_EMAIL || "staff@edin.world").toLowerCase();
  const password = process.env.STAFF_PASSWORD || "welfare123";
  const name = process.env.STAFF_NAME || "Alex Staff";

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.staffUser.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash },
  });

  // A second staff user, handy for demonstrating the concurrent-claim behaviour.
  const email2 = "sam@edin.world";
  await prisma.staffUser.upsert({
    where: { email: email2 },
    update: {},
    create: { email: email2, name: "Sam Staff", passwordHash: await bcrypt.hash(password, 10) },
  });

  console.log(`Seeded staff: ${email} / ${password}  (and ${email2} / ${password})`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
