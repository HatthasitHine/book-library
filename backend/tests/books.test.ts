import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";

const reviewer = {
  username: `books-route-${randomUUID()}`,
  password: "LibraryDemo123!",
};
let reviewerId: number | undefined;
let token: string;
const createdBookIds: number[] = [];
const authHeader = () => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  const passwordHash = await bcrypt.hash(reviewer.password, 10);
  const user = await prisma.user.create({ data: { username: reviewer.username, passwordHash } });
  reviewerId = user.id;

  const response = await request(app).post("/api/login").send(reviewer);
  token = response.body.token;
});

afterAll(async () => {
  if (createdBookIds.length > 0) {
    await prisma.book.deleteMany({ where: { id: { in: createdBookIds } } });
  }
  if (reviewerId !== undefined) {
    await prisma.user.deleteMany({ where: { id: reviewerId, username: reviewer.username } });
  }
});

describe("book routes", () => {
  it.each([
    ["GET", () => request(app).get("/api/books")],
    ["POST", () => request(app).post("/api/books").send({ title: "Dune", author: "Frank Herbert", category: "Science fiction" })],
    ["DELETE", () => request(app).delete("/api/books/1")],
  ])("rejects unauthorized %s requests", async (_method, send) => {
    const response = await send();

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ error: "Access denied: session credential missing or expired" });
  });

  it("lists, creates, and deletes a protected book", async () => {
    expect((await request(app).get("/api/books").set(authHeader())).body).toEqual({ books: [] });

    const created = await request(app).post("/api/books").set(authHeader()).send({
      title: " Dune ",
      author: " Frank Herbert ",
      category: " Science fiction ",
    });
    const createdBookId = created.body.book?.id;
    if (typeof createdBookId === "number") {
      createdBookIds.push(createdBookId);
    }

    expect(created.status).toBe(201);
    expect(created.body.book).toMatchObject({ title: "Dune", author: "Frank Herbert", category: "Science fiction" });

    expect((await request(app).delete(`/api/books/${createdBookId}`).set(authHeader())).status).toBe(204);
    if (typeof createdBookId === "number") {
      createdBookIds.splice(createdBookIds.indexOf(createdBookId), 1);
    }
    expect((await request(app).delete("/api/books/999999").set(authHeader())).status).toBe(404);
  });

  it.each([
    { title: " ", author: "Frank Herbert", category: "Science fiction" },
    { title: "Dune", author: " ", category: "Science fiction" },
    { title: "Dune", author: "Frank Herbert", category: " " },
    { title: "D".repeat(161), author: "Frank Herbert", category: "Science fiction" },
    { title: "Dune", author: "F".repeat(121), category: "Science fiction" },
    { title: "Dune", author: "Frank Herbert", category: "S".repeat(81) },
  ])("rejects invalid book input", async (input) => {
    const response = await request(app).post("/api/books").set(authHeader()).send(input);

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid request");
  });

  it.each(["0", "-1", "1.5", "not-an-id"])('rejects invalid book id "%s"', async (id) => {
    const response = await request(app).delete(`/api/books/${id}`).set(authHeader());

    expect(response.status).toBe(400);
    expect(response.body.error).toBe("Invalid request");
  });
});
