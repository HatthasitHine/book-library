import { apiRequest } from "./client";

export type Book = {
  id: number;
  title: string;
  author: string;
  category: string;
  createdAt: string;
};

export type BookInput = Pick<Book, "title" | "author" | "category">;

export async function listBooks(): Promise<Book[]> {
  const response = await apiRequest<{ books: Book[] }>("/books");
  return response.books;
}

export async function createBook(input: BookInput): Promise<Book> {
  const response = await apiRequest<{ book: Book }>("/books", {
    method: "POST",
    body: JSON.stringify(input),
  });
  return response.book;
}

export async function deleteBook(id: number): Promise<void> {
  await apiRequest<void>(`/books/${id}`, { method: "DELETE" });
}
