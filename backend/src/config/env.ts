import "dotenv/config";
import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(32),
  CLIENT_ORIGIN: z.string().url(),
  SEED_USERNAME: z.string().min(3),
  SEED_PASSWORD: z.string().min(8),
});

export const env = EnvSchema.parse(process.env);
