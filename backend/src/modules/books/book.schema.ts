import { z } from "zod";

export const BookInputSchema = z.object({
  title: z.string().trim().min(1).max(160),
  author: z.string().trim().min(1).max(120),
  category: z.string().trim().min(1).max(80),
});

export const BookIdSchema = z.coerce.number().int().positive();

export type BookInput = z.infer<typeof BookInputSchema>;
