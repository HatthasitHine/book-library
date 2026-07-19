import { spawn } from "node:child_process";
import { mkdir, open, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

export function resolveSqliteUrl(databaseUrl: string, backendDirectory: string): string {
  if (!databaseUrl.startsWith("file:")) {
    throw new Error("DATABASE_URL must use the SQLite file: scheme");
  }

  const backendRoot = resolve(backendDirectory);
  const sqlitePath = databaseUrl.slice("file:".length).replaceAll("\\", "/");
  const databaseFilePath = resolve(backendRoot, sqlitePath);
  const relativePath = relative(backendRoot, databaseFilePath);
  if (
    relativePath === "" ||
    relativePath === ".." ||
    relativePath.startsWith(`..${sep}`) ||
    isAbsolute(relativePath)
  ) {
    throw new Error("SQLite database path must stay within the backend directory");
  }

  return `file:${databaseFilePath.replaceAll("\\", "/")}`;
}

export async function ensureSqliteDatabaseFile(
  databaseUrl: string,
  backendDirectory: string,
  options: { reset?: boolean } = {},
): Promise<string> {
  const absoluteDatabaseUrl = resolveSqliteUrl(databaseUrl, backendDirectory);
  const databaseFilePath = absoluteDatabaseUrl.slice("file:".length);

  if (options.reset) {
    await rm(databaseFilePath, { force: true });
  }
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

async function runPrismaDbPush(databaseUrl: string, options: { reset?: boolean } = {}): Promise<number> {
  const backendDirectory = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const absoluteDatabaseUrl = await ensureSqliteDatabaseFile(databaseUrl, backendDirectory, options);
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

  process.exitCode = await runPrismaDbPush(databaseUrl, { reset: process.argv.slice(3).includes("--reset") });
}
