import { spawn } from "node:child_process";
import { mkdir, open } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export function resolveSqliteUrl(databaseUrl: string, backendDirectory: string): string {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("DATABASE_URL must use the SQLite file: scheme");
  }

  const sqlitePath = databaseUrl.slice("file:".length).replaceAll("\\", "/");
  if (/^(?:[A-Za-z]:\/|\/)/.test(sqlitePath)) {
    return `file:${sqlitePath}`;
  }

  return `file:${resolve(backendDirectory, sqlitePath).replaceAll("\\", "/")}`;
}

export async function ensureSqliteDatabaseFile(databaseUrl: string, backendDirectory: string): Promise<string> {
  const absoluteDatabaseUrl = resolveSqliteUrl(databaseUrl, backendDirectory);
  const databaseFilePath = absoluteDatabaseUrl.slice("file:".length);

  await mkdir(dirname(databaseFilePath), { recursive: true });
  const file = await open(databaseFilePath, "a");
  await file.close();

  return absoluteDatabaseUrl;
}

export function buildDbPushCommand(
  databaseUrl: string,
  backendDirectory: string,
  prismaCliPath: string,
): { executable: string; arguments: string[] } {
  return {
    executable: process.execPath,
    arguments: [prismaCliPath, "db", "push", "--url", resolveSqliteUrl(databaseUrl, backendDirectory)],
  };
}

async function runPrismaDbPush(databaseUrl: string): Promise<number> {
  const backendDirectory = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const absoluteDatabaseUrl = await ensureSqliteDatabaseFile(databaseUrl, backendDirectory);
  const require = createRequire(import.meta.url);
  const prismaCliPath = require.resolve("prisma/build/index.js");
  const command = buildDbPushCommand(absoluteDatabaseUrl, backendDirectory, prismaCliPath);
  const child = spawn(command.executable, command.arguments, {
    cwd: backendDirectory,
    env: { ...process.env, DATABASE_URL: absoluteDatabaseUrl },
    shell: false,
    stdio: "inherit",
  });

  return new Promise((resolveExitCode, reject) => {
    child.once("error", reject);
    child.once("close", (exitCode) => resolveExitCode(exitCode ?? 1));
  });
}

const invokedScript = process.argv[1] && resolve(process.argv[1]);
if (invokedScript === fileURLToPath(import.meta.url)) {
  const databaseUrl = process.argv[2];
  if (!databaseUrl) {
    throw new Error("Usage: tsx scripts/setup-sqlite-db.ts <file:database-url>");
  }

  process.exitCode = await runPrismaDbPush(databaseUrl);
}
