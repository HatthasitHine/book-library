import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { BookForm } from "./BookForm";
import { BookList } from "./BookList";
import { BookSearch } from "./BookSearch";
import { StatusMessage } from "./StatusMessage";
import { LoginPage } from "../pages/LoginPage";
import { AuthProvider } from "../auth/AuthProvider";

const book = {
  id: 1,
  title: "Dune",
  author: "Frank Herbert",
  category: "Science fiction",
  createdAt: "2026-07-19T00:00:00.000Z",
};

describe("library accessibility", () => {
  it("labels login, search, and book-entry inputs", () => {
    render(
      <MemoryRouter>
        <AuthProvider>
          <LoginPage />
        </AuthProvider>
      </MemoryRouter>,
    );

    expect(screen.getByLabelText("ชื่อผู้ใช้")).toBeInTheDocument();
    expect(screen.getByLabelText("รหัสผ่าน")).toBeInTheDocument();
  });

  it("labels search and book-entry inputs", () => {
    render(
      <>
        <BookSearch value="" onChange={vi.fn()} resultCount={1} />
        <BookForm onCreate={vi.fn().mockResolvedValue(undefined)} disabled={false} />
      </>,
    );

    expect(screen.getByLabelText("ค้นหาหนังสือ")).toBeInTheDocument();
    expect(screen.getByLabelText("ชื่อหนังสือ")).toBeInTheDocument();
    expect(screen.getByLabelText("ผู้เขียน")).toBeInTheDocument();
    expect(screen.getByLabelText("หมวดหมู่")).toBeInTheDocument();
  });

  it("includes the active query in the checkout result strip", () => {
    render(<BookSearch value="Dune" onChange={vi.fn()} resultCount={1} />);

    expect(screen.getByRole("status")).toHaveTextContent("Dune");
  });

  it("politely announces status messages and exposes errors as alerts", () => {
    const { rerender } = render(<StatusMessage message="เพิ่มหนังสือแล้ว" />);

    expect(screen.getByRole("status")).toHaveAttribute("aria-live", "polite");

    rerender(<StatusMessage message="ไม่สามารถเพิ่มหนังสือได้" tone="error" />);
    expect(screen.getByRole("alert")).toHaveTextContent("ไม่สามารถเพิ่มหนังสือได้");
  });

  it("gives each delete action its book title", () => {
    render(<BookList books={[book]} onDelete={vi.fn().mockResolvedValue(undefined)} deletingIds={new Set()} />);

    expect(screen.getByRole("button", { name: "ลบ Dune" })).toBeInTheDocument();
  });
});
