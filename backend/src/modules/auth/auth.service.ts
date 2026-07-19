import { comparePassword } from "../../auth/password.js";
import { prisma } from "../../db/prisma.js";
import type { LoginInput } from "./auth.schema.js";

export async function authenticateCredentials(
  input: LoginInput,
): Promise<{ id: number; username: string } | null> {
  const user = await prisma.user.findUnique({ where: { username: input.username } });
  if (!user || !(await comparePassword(input.password, user.passwordHash))) {
    return null;
  }

  return { id: user.id, username: user.username };
}
