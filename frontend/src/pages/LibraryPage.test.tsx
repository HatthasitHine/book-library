import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import App from "../App";
import { AuthProvider } from "../auth/AuthProvider";

const dune = {
  id: 1,
  title: "Dune",
  author: "Frank Herbert",
  category: "Science Fiction",
  createdAt: "2026-07-19T00:00:00.000Z",
};

const earthsea = {
  id: 2,
  title: "A Wizard of Earthsea",
  author: "Ursula K. Le Guin",
  category: "Fantasy",
  createdAt: "2026-07-18T00:00:00.000Z",
};

const server = setupServer(
  http.get("http://localhost:4000/api/books", () => HttpResponse.json({ books: [dune, earthsea] })),
  http.post("http://localhost:4000/api/books", async ({ request }) => {
    const input = (await request.json()) as { title: string; author: string; category: string };
    return HttpResponse.json({ book: { id: 3, ...input, createdAt: "2026-07-19T01:00:00.000Z" } }, { status: 201 });
  }),
  http.delete("http://localhost:4000/api/books/:id", () => new HttpResponse(null, { status: 204 })),
);

function renderLibrary() {
  localStorage.setItem("book-library-token", "test-token");
  localStorage.setItem("book-library-username", "reader");

  return render(
    <MemoryRouter initialEntries={["/books"]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => localStorage.clear());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("LibraryPage", () => {
  it("shows loading before it displays the fetched books", async () => {
    renderLibrary();

    expect(screen.getByText("กำลังเปิดบัตรรายการ…")).toBeInTheDocument();
    expect(await screen.findByText("Dune")).toBeInTheDocument();
  });

  it("creates a book, then clears and focuses the title field", async () => {
    const user = userEvent.setup();
    renderLibrary();
    await screen.findByText("Dune");

    await user.type(screen.getByLabelText("ชื่อหนังสือ"), "The Left Hand of Darkness");
    await user.type(screen.getByLabelText("ผู้เขียน"), "Ursula K. Le Guin");
    await user.type(screen.getByLabelText("หมวดหมู่"), "Science fiction");
    await user.click(screen.getByRole("button", { name: "เพิ่มหนังสือ" }));

    expect(await screen.findByText("เพิ่มหนังสือแล้ว")).toBeInTheDocument();
    expect(screen.getByText("The Left Hand of Darkness")).toBeInTheDocument();
    expect(screen.getByLabelText("ชื่อหนังสือ")).toHaveValue("");
    expect(screen.getByLabelText("ชื่อหนังสือ")).toHaveFocus();
  });

  it("deletes a book only after the server accepts the deletion", async () => {
    const user = userEvent.setup();
    renderLibrary();
    await screen.findByText("Dune");

    await user.click(screen.getByRole("button", { name: "ลบ Dune" }));

    expect(await screen.findByText("ลบหนังสือแล้ว")).toBeInTheDocument();
    expect(screen.queryByText("Dune")).not.toBeInTheDocument();
    expect(screen.getByText("A Wizard of Earthsea")).toBeInTheDocument();
  });

  it("keeps books and shows an actionable error when a mutation fails", async () => {
    const user = userEvent.setup();
    server.use(
      http.post("http://localhost:4000/api/books", () => HttpResponse.json({ error: "Write failed" }, { status: 500 })),
    );
    renderLibrary();
    await screen.findByText("Dune");

    await user.type(screen.getByLabelText("ชื่อหนังสือ"), "Kindred");
    await user.type(screen.getByLabelText("ผู้เขียน"), "Octavia E. Butler");
    await user.type(screen.getByLabelText("หมวดหมู่"), "Science Fiction");
    await user.click(screen.getByRole("button", { name: "เพิ่มหนังสือ" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ไม่สามารถเพิ่มหนังสือได้ กรุณาลองใหม่");
    expect(screen.getByText("Dune")).toBeInTheDocument();
    expect(screen.getByLabelText("ชื่อหนังสือ")).toHaveValue("Kindred");
  });

  it("shows the empty state", async () => {
    server.use(http.get("http://localhost:4000/api/books", () => HttpResponse.json({ books: [] })));
    renderLibrary();

    expect(await screen.findByText("ยังไม่มีหนังสือในคลัง")).toBeInTheDocument();
  });

  it("filters title, author, and category case-insensitively without mutating books", async () => {
    const user = userEvent.setup();
    renderLibrary();
    await screen.findByText("Dune");
    const search = screen.getByLabelText("ค้นหาหนังสือ");

    await user.type(search, "SCIENCE");
    expect(screen.getByText("Dune")).toBeInTheDocument();
    expect(screen.queryByText("A Wizard of Earthsea")).not.toBeInTheDocument();
    expect(screen.getByText("พบ 1 เล่ม")).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "le guin");
    expect(screen.getByText("A Wizard of Earthsea")).toBeInTheDocument();

    await user.clear(search);
    await user.type(search, "DUNE");
    expect(screen.getByText("Dune")).toBeInTheDocument();

    await user.clear(search);
    expect(screen.getByText("Dune")).toBeInTheDocument();
    expect(screen.getByText("A Wizard of Earthsea")).toBeInTheDocument();
  });
});
