import { hash } from "bcryptjs";
import { env } from "../src/config/env.js";
import { prisma } from "../src/db/prisma.js";

const passwordHash = await hash(env.SEED_PASSWORD, 12);

await prisma.user.upsert({
  where: { username: env.SEED_USERNAME },
  update: { passwordHash },
  create: { username: env.SEED_USERNAME, passwordHash },
});

await prisma.$disconnect();
