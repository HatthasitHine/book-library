import type { Book } from "../api/books";

interface BookListProps {
  books: Book[];
  onDelete: (id: number) => Promise<void>;
  deletingIds: ReadonlySet<number>;
  isFiltered?: boolean;
}

export function BookList({ books, onDelete, deletingIds, isFiltered = false }: BookListProps) {
  if (books.length === 0) {
    return <p>{isFiltered ? "ไม่พบหนังสือที่ตรงกับการค้นหา" : "ยังไม่มีหนังสือในคลัง"}</p>;
  }

  return (
    <ul aria-label="รายการหนังสือ">
      {books.map((book) => (
        <li key={book.id}>
          <article>
            <h2>{book.title}</h2>
            <p>{book.author}</p>
            <p>{book.category}</p>
            <button type="button" onClick={() => void onDelete(book.id)} disabled={deletingIds.has(book.id)}>
              ลบ {book.title}
            </button>
          </article>
        </li>
      ))}
    </ul>
  );
}
