import { comparePassword } from "../../auth/password.js";
import { prisma } from "../../db/prisma.js";
import type { LoginInput } from "./auth.schema.js";

const DUMMY_PASSWORD_HASH = "$2b$12$oWccYtLPHQgKI8m2GnLk7edvOS7O7hMY9Wy0fBvljAT4Zuxu287YW";

export async function authenticateCredentials(
  input: LoginInput,
): Promise<{ id: number; username: string } | null> {
  const user = await prisma.user.findUnique({ where: { username: input.username } });
  const passwordMatches = await comparePassword(input.password, user?.passwordHash ?? DUMMY_PASSWORD_HASH);

  if (!user || !passwordMatches) {
    return null;
  }

  return { id: user.id, username: user.username };
}
