import "dotenv/config";
import { spawn } from "node:child_process";
import { mkdir, open, rm } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, isAbsolute, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

function pathsAreEqual(left: string, right: string): boolean {
  const normalizedLeft = resolve(left);
  const normalizedRight = resolve(right);

  return process.platform === "win32"
    ? normalizedLeft.toLowerCase() === normalizedRight.toLowerCase()
    : normalizedLeft === normalizedRight;
}

export function resolveSetupDatabaseUrl(
  explicitDatabaseUrl: string | undefined,
  configuredDatabaseUrl: string | undefined,
): string {
  const databaseUrl = explicitDatabaseUrl ?? configuredDatabaseUrl;
  if (!databaseUrl) {
    throw new Error("DATABASE_URL must be set when no explicit test database URL is provided");
  }

  return databaseUrl;
}

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
    const testDatabaseFilePath = resolve(backendDirectory, "test.db");
    if (!pathsAreEqual(databaseFilePath, testDatabaseFilePath)) {
      throw new Error("SQLite reset is only allowed for the backend test database");
    }
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
  const arguments_ = process.argv.slice(2);
  const explicitDatabaseUrl = arguments_.find((argument) => !argument.startsWith("--"));
  const databaseUrl = resolveSetupDatabaseUrl(explicitDatabaseUrl, process.env.DATABASE_URL);

  process.exitCode = await runPrismaDbPush(databaseUrl, { reset: arguments_.includes("--reset") });
}
