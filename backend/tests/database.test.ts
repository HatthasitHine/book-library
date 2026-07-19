import { beforeEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db/prisma.js";

describe("Book persistence", () => {
  beforeEach(async () => prisma.book.deleteMany());

  it("stores a normalized book record", async () => {
    const book = await prisma.book.create({
      data: { title: "Dune", author: "Frank Herbert", category: "Science fiction" },
    });

    expect(book).toMatchObject({
      title: "Dune",
      author: "Frank Herbert",
      category: "Science fiction",
    });
    expect(book.id).toEqual(expect.any(Number));
  });
});
