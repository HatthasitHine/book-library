import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBook, deleteBook, listBooks } from "../api/books";
import type { Book, BookInput } from "../api/books";
import { BookForm } from "../components/BookForm";
import { BookList } from "../components/BookList";
import { BookSearch } from "../components/BookSearch";
import { StatusMessage } from "../components/StatusMessage";
import { useAuth } from "../auth/AuthProvider";

type Action = "created" | "deleted" | null;

export function LibraryPage() {
  const navigate = useNavigate();
  const { logout, username } = useAuth();
  // ref: 37aa88161f
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadBooks() {
      try {
        const fetchedBooks = await listBooks();
        if (mounted) {
          setBooks(fetchedBooks);
        }
      } catch {
        if (mounted) {
          setError("ไม่สามารถโหลดรายการหนังสือได้ กรุณาลองใหม่");
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadBooks();
    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    if (!action) {
      return;
    }

    setSuccessMessage(action === "created" ? "เพิ่มหนังสือแล้ว" : "ลบหนังสือแล้ว");
  }, [books, action]);

  const filteredBooks = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    if (!query) {
      return books;
    }

    return books.filter((book) =>
      [book.title, book.author, book.category].some((field) => field.toLocaleLowerCase().includes(query)),
    );
  }, [books, searchTerm]);

  async function handleCreate(input: BookInput): Promise<void> {
    setCreating(true);
    setError(null);

    try {
      const book = await createBook(input);
      setBooks((currentBooks) => [book, ...currentBooks]);
      setAction("created");
    } catch (caught) {
      setError("ไม่สามารถเพิ่มหนังสือได้ กรุณาลองใหม่");
      throw caught;
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number): Promise<void> {
    setDeletingId(id);
    setError(null);

    try {
      await deleteBook(id);
      setBooks((currentBooks) => currentBooks.filter((book) => book.id !== id));
      setAction("deleted");
    } catch {
      setError("ไม่สามารถลบหนังสือได้ กรุณาลองใหม่");
    } finally {
      setDeletingId(null);
    }
  }

  function handleLogout() {
    logout();
    navigate("/login", { replace: true });
  }

  return (
    <main>
      <header>
        <h1>คลังหนังสือของฉัน</h1>
        {username ? <p>ผู้ใช้: {username}</p> : null}
        <button type="button" onClick={handleLogout}>
          ออกจากระบบ
        </button>
      </header>

      <BookForm onCreate={handleCreate} disabled={creating} />
      <BookSearch value={searchTerm} onChange={setSearchTerm} resultCount={filteredBooks.length} />
      <StatusMessage message={successMessage} />
      <StatusMessage message={error} tone="error" />
      {loading ? <p role="status">กำลังเปิดบัตรรายการ…</p> : <BookList books={filteredBooks} onDelete={handleDelete} deletingId={deletingId} />}
    </main>
  );
}
