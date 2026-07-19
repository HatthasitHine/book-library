import { describe, expect, it } from "vitest";
import { resolvePrismaDatabaseUrl } from "../prisma.config.js";

describe("Prisma client generation", () => {
  it("uses the local SQLite URL before a fresh checkout has copied its .env file", () => {
    expect(resolvePrismaDatabaseUrl(undefined)).toBe("file:./dev.db");
  });

  it("preserves an explicitly configured database URL", () => {
    expect(resolvePrismaDatabaseUrl("file:./review.db")).toBe("file:./review.db");
  });
});
