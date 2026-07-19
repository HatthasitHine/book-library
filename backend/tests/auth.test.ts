import bcrypt from "bcryptjs";
import express, { type NextFunction, type Request, type Response } from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { signAccessToken, verifyAccessToken } from "../src/auth/token.js";
import { env } from "../src/config/env.js";
import { prisma } from "../src/db/prisma.js";
import { authenticate } from "../src/middleware/authenticate.js";
import { authRouter } from "../src/modules/auth/auth.routes.js";

const reviewer = {
  username: "reviewer",
  password: "LibraryDemo123!",
};

const app = express();
app.use(express.json());
app.use("/api", authRouter);
app.get("/api/protected", authenticate, (req, res) => {
  res.status(200).json({ auth: req.auth });
});
app.use((error: unknown, _req: Request, res: Response, next: NextFunction) => {
  if (error instanceof ZodError) {
    return res.status(400).json({ error: "Invalid request", details: error.flatten() });
  }

  next(error);
});

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(reviewer.password, 10);
  await prisma.user.upsert({
    where: { username: reviewer.username },
    update: { passwordHash },
    create: { username: reviewer.username, passwordHash },
  });
});

afterAll(async () => {
  await prisma.book.deleteMany();
  await prisma.user.deleteMany({ where: { username: reviewer.username } });
});

describe("POST /api/login", () => {
  it("returns a JWT for valid reviewer credentials", async () => {
    const response = await request(app).post("/api/login").send(reviewer);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      token: expect.any(String),
      user: { username: reviewer.username },
    });
    expect(verifyAccessToken(response.body.token)).toEqual({
      sub: expect.any(String),
      username: reviewer.username,
    });
  });

  it.each([
    { username: reviewer.username, password: "wrong-password" },
    { username: "missing", password: reviewer.password },
  ])("rejects invalid credentials without revealing which field failed", async (credentials) => {
    const response = await request(app).post("/api/login").send(credentials);

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Invalid username or password" });
  });

  it.each([
    {},
    { username: reviewer.username },
    { password: reviewer.password },
    { username: "   ", password: reviewer.password },
    { username: reviewer.username, password: "" },
  ])("rejects invalid login input", async (credentials) => {
    const response = await request(app).post("/api/login").send(credentials);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid request");
  });

  it("trims a username before authenticating", async () => {
    const response = await request(app)
      .post("/api/login")
      .send({ username: `  ${reviewer.username}  `, password: reviewer.password });

    expect(response.status).toBe(200);
    expect(response.body.user).toEqual({ username: reviewer.username });
  });
});

describe("access tokens", () => {
  it("uses HS256 with the required issuer, audience, and one-hour expiry", () => {
    const token = signAccessToken({ id: 42, username: reviewer.username });
    const decoded = jwt.decode(token, { complete: true });

    expect(decoded).toMatchObject({
      header: { alg: "HS256" },
      payload: {
        sub: "42",
        username: reviewer.username,
        iss: "personal-book-library",
        aud: "book-library-web",
      },
    });
    expect((decoded?.payload as jwt.JwtPayload).exp).toBeGreaterThan(
      (decoded?.payload as jwt.JwtPayload).iat! + 3_500,
    );
  });

  it.each([
    ["a different algorithm", { algorithm: "HS384" as const }],
    ["a different issuer", { issuer: "not-personal-book-library" }],
    ["a different audience", { audience: "not-book-library-web" }],
  ])("rejects a token with %s", (_description, overrides) => {
    const token = jwt.sign({ sub: "42", username: reviewer.username }, env.JWT_SECRET, {
      algorithm: "HS256",
      issuer: "personal-book-library",
      audience: "book-library-web",
      expiresIn: "1h",
      ...overrides,
    });

    expect(() => verifyAccessToken(token)).toThrow();
  });

  it("rejects a token with a non-numeric subject", () => {
    const token = jwt.sign({ sub: "not-a-user-id", username: reviewer.username }, env.JWT_SECRET, {
      algorithm: "HS256",
      issuer: "personal-book-library",
      audience: "book-library-web",
      expiresIn: "1h",
    });

    expect(() => verifyAccessToken(token)).toThrow();
  });
});

describe("authenticate", () => {
  it.each([
    ["an absent token", undefined],
    ["a malformed authorization header", "Bearer"],
    ["an authorization header with extra segments", "Bearer token extra"],
    ["a non-Bearer authorization header", "Basic token"],
    ["an invalid token", "Bearer not-a-jwt"],
    [
      "an expired token",
      `Bearer ${jwt.sign({ sub: "42", username: reviewer.username }, env.JWT_SECRET, {
        algorithm: "HS256",
        issuer: "personal-book-library",
        audience: "book-library-web",
        expiresIn: "-1s",
      })}`,
    ],
  ])("rejects %s with the shared credential failure response", async (_description, authorization) => {
    const testRequest = request(app).get("/api/protected");
    if (authorization) {
      testRequest.set("Authorization", authorization);
    }

    const response = await testRequest;

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Access denied: session credential missing or expired" });
  });

  it("assigns the verified principal to the Express request", async () => {
    const token = signAccessToken({ id: 42, username: reviewer.username });
    const response = await request(app)
      .get("/api/protected")
      .set("Authorization", `bearer ${token}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ auth: { userId: 42, username: reviewer.username } });
  });
});
