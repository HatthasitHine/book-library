import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildDbPushCommand,
  ensureSqliteDatabaseFile,
  resolveSqliteUrl,
} from "../scripts/setup-sqlite-db.js";

const backendDirectory = resolve("backend");
const localPrismaCli = createRequire(import.meta.url).resolve("prisma/build/index.js");

describe("SQLite database setup command", () => {
  it("resolves relative SQLite URLs from the backend directory", () => {
    expect(resolveSqliteUrl("file:./test.db", backendDirectory)).toBe(
      `file:${resolve(backendDirectory, "test.db").replaceAll("\\", "/")}`,
    );
  });

  it("preserves an already absolute SQLite URL", () => {
    expect(resolveSqliteUrl("file:D:/workspace/backend/test.db", backendDirectory)).toBe(
      "file:D:/workspace/backend/test.db",
    );
  });

  it("builds a shell-free Node command for the resolved local Prisma CLI", () => {
    expect(buildDbPushCommand("file:./test.db", backendDirectory, localPrismaCli)).toEqual({
      executable: process.execPath,
      arguments: [
        localPrismaCli,
        "db",
        "push",
        "--url",
        `file:${resolve(backendDirectory, "test.db").replaceAll("\\", "/")}`,
      ],
    });
  });

  it("creates a missing SQLite database file at its resolved absolute URL", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "book-library-db-"));
    try {
      const databaseUrl = await ensureSqliteDatabaseFile("file:./nested/library.db", directory);

      expect(databaseUrl).toBe(`file:${resolve(directory, "nested/library.db").replaceAll("\\", "/")}`);
      await expect(readFile(resolve(directory, "nested/library.db"))).resolves.toEqual(Buffer.alloc(0));
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });

  it("does not truncate an existing SQLite database file", async () => {
    const directory = await mkdtemp(resolve(tmpdir(), "book-library-db-"));
    const databaseFile = resolve(directory, "library.db");
    try {
      await writeFile(databaseFile, "existing database content");

      await ensureSqliteDatabaseFile("file:./library.db", directory);

      await expect(readFile(databaseFile, "utf8")).resolves.toBe("existing database content");
    } finally {
      await rm(directory, { recursive: true, force: true });
    }
  });
});
