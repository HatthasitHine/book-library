import { Router } from "express";
import { authenticate } from "../../middleware/authenticate.js";
import { BookIdSchema, BookInputSchema } from "./book.schema.js";
import { createBook, deleteBook, listBooks } from "./book.service.js";

export const bookRouter = Router();

// ref: 37aa88161f
bookRouter.use(authenticate);

bookRouter.get("/", async (_req, res) => {
  res.status(200).json({ books: await listBooks() });
});

bookRouter.post("/", async (req, res) => {
  const book = await createBook(BookInputSchema.parse(req.body));
  res.status(201).json({ book });
});

bookRouter.delete("/:id", async (req, res) => {
  const id = BookIdSchema.parse(req.params.id);
  if (!(await deleteBook(id))) {
    res.status(404).json({ error: "Book not found" });
    return;
  }

  res.status(204).end();
});
