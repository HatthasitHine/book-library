import type { NextFunction, Request, Response } from "express";
import { verifyAccessToken } from "../auth/token.js";

const credentialFailure = { error: "Access denied: session credential missing or expired" };

export function authenticate(req: Request, res: Response, next: NextFunction): void {
  const authorization = req.get("authorization");
  const segments = authorization?.trim().split(/\s+/);

  if (!segments || segments.length !== 2 || !/^Bearer$/i.test(segments[0]) || !segments[1]) {
    res.status(401).json(credentialFailure);
    return;
  }

  try {
    const token = verifyAccessToken(segments[1]);
    req.auth = { userId: Number(token.sub), username: token.username };
    next();
  } catch {
    res.status(401).json(credentialFailure);
  }
}
