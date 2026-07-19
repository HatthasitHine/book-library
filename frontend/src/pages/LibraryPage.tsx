import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBook, deleteBook, listBooks } from "../api/books";
import type { Book, BookInput } from "../api/books";
import { ApiError } from "../api/types";
import { BookForm } from "../components/BookForm";
import { BookList } from "../components/BookList";
import { BookSearch } from "../components/BookSearch";
import { StatusMessage } from "../components/StatusMessage";
import { useAuth } from "../auth/authContext";

type LoadState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready" };

type Notice =
  | { id: number; tone: "success"; message: string }
  | { id: number; tone: "error"; message: string }
  | null;

export function LibraryPage() {
  const navigate = useNavigate();
  const { logout, username } = useAuth();
  // ref: 37aa88161f
  const [books, setBooks] = useState<Book[]>([]);
  const [loadState, setLoadState] = useState<LoadState>({ status: "loading" });
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [creating, setCreating] = useState(false);
  const [deletingIds, setDeletingIds] = useState<ReadonlySet<number>>(() => new Set());
  const [searchTerm, setSearchTerm] = useState("");
  const [notice, setNotice] = useState<Notice>(null);
  const mountedRef = useRef(false);
  const noticeIdRef = useRef(0);
  const pendingDeleteIdsRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadBooks() {
      try {
        const fetchedBooks = await listBooks();
        if (active) {
          setBooks(fetchedBooks);
          setLoadState({ status: "ready" });
        }
      } catch {
        if (active) {
          setLoadState({ status: "error", message: "ไม่สามารถโหลดรายการหนังสือได้ กรุณาลองใหม่" });
        }
      }
    }

    void loadBooks();
    return () => {
      active = false;
    };
  }, [loadAttempt]);

  const filteredBooks = useMemo(() => {
    const query = searchTerm.trim().toLocaleLowerCase();
    if (!query) {
      return books;
    }

    return books.filter((book) =>
      [book.title, book.author, book.category].some((field) => field.toLocaleLowerCase().includes(query)),
    );
  }, [books, searchTerm]);

  function showNotice(tone: "success" | "error", message: string) {
    noticeIdRef.current += 1;
    setNotice({ id: noticeIdRef.current, tone, message });
  }

  async function handleCreate(input: BookInput): Promise<void> {
    let unauthorized = false;
    setCreating(true);
    setNotice(null);

    try {
      const book = await createBook(input);
      if (!mountedRef.current) {
        throw new Error("Library page unmounted");
      }

      setBooks((currentBooks) => [book, ...currentBooks]);
      showNotice("success", "เพิ่มหนังสือแล้ว");
    } catch (caught) {
      unauthorized = caught instanceof ApiError && caught.status === 401;
      if (mountedRef.current && !unauthorized) {
        showNotice("error", "ไม่สามารถเพิ่มหนังสือได้ กรุณาลองใหม่");
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
    setNotice(null);

    try {
      await deleteBook(id);
      if (!mountedRef.current) {
        return;
      }

      setBooks((currentBooks) => currentBooks.filter((book) => book.id !== id));
      showNotice("success", "ลบหนังสือแล้ว");
    } catch (caught) {
      unauthorized = caught instanceof ApiError && caught.status === 401;
      if (mountedRef.current && !unauthorized) {
        showNotice("error", "ไม่สามารถลบหนังสือได้ กรุณาลองใหม่");
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

  function handleRetryLoad() {
    setLoadState({ status: "loading" });
    setLoadAttempt((currentAttempt) => currentAttempt + 1);
  }

  return (
    <main className="library-page">
      <header className="library-header">
        <p className="eyebrow">PERSONAL CATALOGUE</p>
        <h1>คลังหนังสือของฉัน</h1>
        {username ? <p className="reader-name">ผู้ใช้: {username}</p> : null}
      </header>

      <div className="library-layout">
        <section className="catalogue-search" aria-label="ค้นหาในคลัง">
          <BookSearch value={searchTerm} onChange={setSearchTerm} resultCount={filteredBooks.length} />
        </section>
        <aside className="form-rail" aria-label="เพิ่มหนังสือ">
          <h2>ลงรายการใหม่</h2>
          <BookForm onCreate={handleCreate} disabled={loadState.status !== "ready" || creating} />
        </aside>
        <section className="catalogue" aria-label="รายการในคลัง">
          {loadState.status === "loading" ? (
            <p className="loading-state" role="status" aria-live="polite">กำลังเปิดบัตรรายการ…</p>
          ) : null}
          {loadState.status === "error" ? (
            <>
              <StatusMessage message={loadState.message} tone="error" />
              <button type="button" onClick={handleRetryLoad}>ลองโหลดอีกครั้ง</button>
            </>
          ) : null}
          {loadState.status === "ready" ? (
            <>
              <StatusMessage key={notice?.id} message={notice?.message ?? null} tone={notice?.tone} />
              <BookList
                books={filteredBooks}
                onDelete={handleDelete}
                deletingIds={deletingIds}
                isFiltered={searchTerm.trim().length > 0}
              />
            </>
          ) : null}
        </section>
      </div>
      <footer className="library-session">
        <button type="button" onClick={handleLogout}>
          ออกจากระบบ
        </button>
      </footer>
    </main>
  );
}
