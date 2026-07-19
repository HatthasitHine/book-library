import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const tokenOptions = {
  algorithm: "HS256" as const,
  issuer: "personal-book-library",
  audience: "book-library-web",
};

export function signAccessToken(user: { id: number; username: string }): string {
  return jwt.sign({ sub: String(user.id), username: user.username }, env.JWT_SECRET, {
    ...tokenOptions,
    expiresIn: "1h",
  });
}

export function verifyAccessToken(token: string): { sub: string; username: string } {
  const payload = jwt.verify(token, env.JWT_SECRET, {
    ...tokenOptions,
    algorithms: ["HS256"],
  });

  if (typeof payload === "string" || typeof payload.sub !== "string" || typeof payload.username !== "string") {
    throw new jwt.JsonWebTokenError("Invalid access token payload");
  }

  const userId = Number(payload.sub);
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new jwt.JsonWebTokenError("Invalid access token subject");
  }

  return { sub: payload.sub, username: payload.username };
}
