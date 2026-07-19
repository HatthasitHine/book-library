import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

const { comparePasswordMock } = vi.hoisted(() => ({
  comparePasswordMock: vi.fn<(password: string, hash: string) => Promise<boolean>>(),
}));

vi.mock("../src/auth/password.js", () => ({ comparePassword: comparePasswordMock }));

import { prisma } from "../src/db/prisma.js";
import { authenticateCredentials } from "../src/modules/auth/auth.service.js";

const suiteUsername = `auth-service-${randomUUID()}`;
const absentUsername = `missing-${randomUUID()}`;

beforeAll(async () => {
  await prisma.user.create({
    data: {
      username: suiteUsername,
      passwordHash: "$2b$12$LQv3c1J5rcH2Dh1eUQW2GOniMzUM6My60R68zzYJrkqPpbVF9AC2K",
    },
  });
});

beforeEach(() => {
  comparePasswordMock.mockReset();
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { username: suiteUsername } });
});

describe("authenticateCredentials", () => {
  it.each([
    ["an unknown username", absentUsername],
    ["a wrong password", suiteUsername],
  ])("performs one password comparison for %s", async (_description, username) => {
    comparePasswordMock.mockResolvedValue(false);

    const result = await authenticateCredentials({ username, password: "wrong-password" });

    expect(result).toBeNull();
    expect(comparePasswordMock).toHaveBeenCalledTimes(1);
  });
});
