import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBook, deleteBook, listBooks } from "../api/books";
import type { Book, BookInput } from "../api/books";
import { ApiError } from "../api/types";
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
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<number>>(() => new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [action, setAction] = useState<Action>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const mountedRef = useRef(false);
  const pendingDeleteIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    async function loadBooks() {
      try {
        const fetchedBooks = await listBooks();
        if (mountedRef.current) {
          setBooks(fetchedBooks);
        }
      } catch {
        if (mountedRef.current) {
          setError("ไม่สามารถโหลดรายการหนังสือได้ กรุณาลองใหม่");
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }

    void loadBooks();
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
    let unauthorized = false;
    setCreating(true);
    setError(null);

    try {
      const book = await createBook(input);
      if (!mountedRef.current) {
        throw new Error("Library page unmounted");
      }

      setBooks((currentBooks) => [book, ...currentBooks]);
      setAction("created");
    } catch (caught) {
      unauthorized = caught instanceof ApiError && caught.status === 401;
      if (mountedRef.current && !unauthorized) {
        setError("ไม่สามารถเพิ่มหนังสือได้ กรุณาลองใหม่");
      }
      throw caught;
    } finally {
      if (mountedRef.current && !unauthorized) {
        setCreating(false);
      }
    }
  }

  async function handleDelete(id: number): Promise<void> {
    let unauthorized = false;
    if (pendingDeleteIdsRef.current.has(id)) {
      return;
    }

    pendingDeleteIdsRef.current.add(id);
    setDeletingIds((currentIds) => new Set(currentIds).add(id));
    setError(null);

    try {
      await deleteBook(id);
      if (!mountedRef.current) {
        return;
      }

      setBooks((currentBooks) => currentBooks.filter((book) => book.id !== id));
      setAction("deleted");
    } catch (caught) {
      unauthorized = caught instanceof ApiError && caught.status === 401;
      if (mountedRef.current && !unauthorized) {
        setError("ไม่สามารถลบหนังสือได้ กรุณาลองใหม่");
      }
    } finally {
      pendingDeleteIdsRef.current.delete(id);
      if (mountedRef.current && !unauthorized) {
        setDeletingIds((currentIds) => {
          const nextIds = new Set(currentIds);
          nextIds.delete(id);
          return nextIds;
        });
      }
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

      <BookForm onCreate={handleCreate} disabled={loading || creating} />
      <BookSearch value={searchTerm} onChange={setSearchTerm} resultCount={filteredBooks.length} />
      <StatusMessage message={successMessage} />
      <StatusMessage message={error} tone="error" />
      {loading ? <p role="status">กำลังเปิดบัตรรายการ…</p> : <BookList books={filteredBooks} onDelete={handleDelete} deletingIds={deletingIds} />}
    </main>
  );
}
