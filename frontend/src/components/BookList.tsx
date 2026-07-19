import type { Book } from "../api/books";

interface BookListProps {
  books: Book[];
  onDelete: (id: number) => Promise<void>;
  deletingId: number | null;
}

export function BookList({ books, onDelete, deletingId }: BookListProps) {
  if (books.length === 0) {
    return <p>ยังไม่มีหนังสือในคลัง</p>;
  }

  return (
    <ul aria-label="รายการหนังสือ">
      {books.map((book) => (
        <li key={book.id}>
          <article>
            <h2>{book.title}</h2>
            <p>{book.author}</p>
            <p>{book.category}</p>
            <button type="button" onClick={() => void onDelete(book.id)} disabled={deletingId === book.id}>
              ลบ {book.title}
            </button>
          </article>
        </li>
      ))}
    </ul>
  );
}
