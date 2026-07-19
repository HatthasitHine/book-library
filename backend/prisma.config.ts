import "dotenv/config";
import { defineConfig } from "prisma/config";

export function resolvePrismaDatabaseUrl(databaseUrl: string | undefined): string {
  return databaseUrl ?? "file:./dev.db";
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: resolvePrismaDatabaseUrl(process.env.DATABASE_URL),
  },
});
