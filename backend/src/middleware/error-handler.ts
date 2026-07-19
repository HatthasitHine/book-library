import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";

function getTrustedClientErrorStatus(error: unknown): number | undefined {
  if (!(error instanceof Error)) {
    return undefined;
  }

  const httpError = error as Error & {
    expose?: unknown;
    status?: unknown;
    statusCode?: unknown;
  };
  if (httpError.expose !== true) {
    return undefined;
  }

  const status = typeof httpError.status === "number" ? httpError.status : httpError.statusCode;
  return typeof status === "number" && Number.isInteger(status) && status >= 400 && status < 500
    ? status
    : undefined;
}

export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: "Invalid request", details: error.flatten() });
    return;
  }

  const clientErrorStatus = getTrustedClientErrorStatus(error);
  if (clientErrorStatus !== undefined) {
    res.status(clientErrorStatus).json({ error: error.message });
    return;
  }

  res.status(500).json({ error: "Internal server error" });
};
