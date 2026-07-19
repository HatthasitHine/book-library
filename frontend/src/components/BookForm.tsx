import { useEffect, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { BookInput } from "../api/books";

interface BookFormProps {
  onCreate: (input: BookInput) => Promise<void>;
  disabled: boolean;
}

export function BookForm({ onCreate, disabled }: BookFormProps) {
  const titleRef = useRef<HTMLInputElement>(null);
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [category, setCategory] = useState("");
  const [focusAfterSuccess, setFocusAfterSuccess] = useState(false);
  const mountedRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!focusAfterSuccess || !mountedRef.current) {
      return;
    }

    titleRef.current?.focus();
    setFocusAfterSuccess(false);
  }, [focusAfterSuccess]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    try {
      await onCreate({ title, author, category });
      if (!mountedRef.current) {
        return;
      }

      setTitle("");
      setAuthor("");
      setCategory("");
      setFocusAfterSuccess(true);
    } catch {
      // The parent owns the mutation error message and leaves the form intact.
    }
  }

  return (
    <form className="book-form" onSubmit={handleSubmit}>
      <div>
        <label htmlFor="book-title">ชื่อหนังสือ</label>
        <input
          ref={titleRef}
          id="book-title"
          name="title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          disabled={disabled}
        />
      </div>
      <div>
        <label htmlFor="book-author">ผู้เขียน</label>
        <input
          id="book-author"
          name="author"
          value={author}
          onChange={(event) => setAuthor(event.target.value)}
          required
          disabled={disabled}
        />
      </div>
      <div>
        <label htmlFor="book-category">หมวดหมู่</label>
        <input
          id="book-category"
          name="category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          required
          disabled={disabled}
        />
      </div>
      <button type="submit" disabled={disabled}>
        เพิ่มหนังสือ
      </button>
    </form>
  );
}
