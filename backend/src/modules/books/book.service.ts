import { prisma } from "../../db/prisma.js";
import type { BookInput } from "./book.schema.js";

export function listBooks() {
  return prisma.book.findMany({ orderBy: { createdAt: "desc" } });
}

export function createBook(input: BookInput) {
  return prisma.book.create({ data: input });
}

export async function deleteBook(id: number): Promise<boolean> {
  const result = await prisma.book.deleteMany({ where: { id } });
  return result.count === 1;
}
