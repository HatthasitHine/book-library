import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { StrictMode } from "react";
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

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

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

function renderStrictLibrary() {
  localStorage.setItem("book-library-token", "test-token");
  localStorage.setItem("book-library-username", "reader");

  return render(
    <StrictMode>
      <MemoryRouter initialEntries={["/books"]}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MemoryRouter>
    </StrictMode>,
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
    expect(screen.getByLabelText("ชื่อหนังสือ")).not.toHaveFocus();
  });

  it("replaces a success notice with the next mutation failure", async () => {
    const user = userEvent.setup();
    let createAttempts = 0;
    server.use(
      http.post("http://localhost:4000/api/books", async ({ request }) => {
        createAttempts += 1;
        if (createAttempts === 2) {
          return HttpResponse.json({ error: "Write failed" }, { status: 500 });
        }

        const input = (await request.json()) as { title: string; author: string; category: string };
        return HttpResponse.json({ book: { id: 3, ...input, createdAt: "2026-07-19T01:00:00.000Z" } }, { status: 201 });
      }),
    );
    renderLibrary();
    await screen.findByText("Dune");

    await user.type(screen.getByLabelText("ชื่อหนังสือ"), "Kindred");
    await user.type(screen.getByLabelText("ผู้เขียน"), "Octavia E. Butler");
    await user.type(screen.getByLabelText("หมวดหมู่"), "Science Fiction");
    await user.click(screen.getByRole("button", { name: "เพิ่มหนังสือ" }));
    expect(await screen.findByText("เพิ่มหนังสือแล้ว")).toBeInTheDocument();

    await user.type(screen.getByLabelText("ชื่อหนังสือ"), "Dawn");
    await user.type(screen.getByLabelText("ผู้เขียน"), "Octavia E. Butler");
    await user.type(screen.getByLabelText("หมวดหมู่"), "Science Fiction");
    await user.click(screen.getByRole("button", { name: "เพิ่มหนังสือ" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("ไม่สามารถเพิ่มหนังสือได้ กรุณาลองใหม่");
    expect(screen.queryByText("เพิ่มหนังสือแล้ว")).not.toBeInTheDocument();
  });

  it("creates a fresh announcement for repeated successful actions of the same kind", async () => {
    const user = userEvent.setup();
    let nextBookId = 3;
    server.use(
      http.post("http://localhost:4000/api/books", async ({ request }) => {
        const input = (await request.json()) as { title: string; author: string; category: string };
        const id = nextBookId;
        nextBookId += 1;
        return HttpResponse.json({ book: { id, ...input, createdAt: "2026-07-19T01:00:00.000Z" } }, { status: 201 });
      }),
    );
    renderLibrary();
    await screen.findByText("Dune");

    await user.type(screen.getByLabelText("ชื่อหนังสือ"), "Kindred");
    await user.type(screen.getByLabelText("ผู้เขียน"), "Octavia E. Butler");
    await user.type(screen.getByLabelText("หมวดหมู่"), "Science Fiction");
    await user.click(screen.getByRole("button", { name: "เพิ่มหนังสือ" }));
    const firstNotice = await screen.findByText("เพิ่มหนังสือแล้ว");

    await user.type(screen.getByLabelText("ชื่อหนังสือ"), "Dawn");
    await user.type(screen.getByLabelText("ผู้เขียน"), "Octavia E. Butler");
    await user.type(screen.getByLabelText("หมวดหมู่"), "Science Fiction");
    await user.click(screen.getByRole("button", { name: "เพิ่มหนังสือ" }));
    await screen.findByText("Dawn");

    expect(screen.getByText("เพิ่มหนังสือแล้ว")).not.toBe(firstNotice);
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

  it("distinguishes zero search matches from an empty collection", async () => {
    const user = userEvent.setup();
    renderLibrary();
    await screen.findByText("Dune");

    await user.type(screen.getByLabelText("ค้นหาหนังสือ"), "no such book");

    expect(screen.getByText("ไม่พบหนังสือที่ตรงกับการค้นหา")).toBeInTheDocument();
    expect(screen.queryByText("ยังไม่มีหนังสือในคลัง")).not.toBeInTheDocument();
  });

  it("keeps create controls disabled until the initial book load settles", async () => {
    const response = deferred<Response>();
    server.use(http.get("http://localhost:4000/api/books", () => response.promise));
    renderLibrary();

    expect(screen.getByLabelText("ชื่อหนังสือ")).toBeDisabled();
    expect(screen.getByRole("button", { name: "เพิ่มหนังสือ" })).toBeDisabled();

    response.resolve(HttpResponse.json({ books: [dune, earthsea] }));

    expect(await screen.findByText("Dune")).toBeInTheDocument();
    expect(screen.getByLabelText("ชื่อหนังสือ")).toBeEnabled();
    expect(screen.getByRole("button", { name: "เพิ่มหนังสือ" })).toBeEnabled();
  });

  it("shows only a retryable load error and keeps mutations disabled until a valid snapshot exists", async () => {
    const user = userEvent.setup();
    const retryResponse = deferred<Response>();
    let loadAttempts = 0;
    server.use(
      http.get("http://localhost:4000/api/books", () => {
        loadAttempts += 1;
        return loadAttempts === 1
          ? HttpResponse.json({ error: "Read failed" }, { status: 500 })
          : retryResponse.promise;
      }),
    );
    renderLibrary();

    expect(await screen.findByRole("alert")).toHaveTextContent("ไม่สามารถโหลดรายการหนังสือได้ กรุณาลองใหม่");
    expect(screen.queryByText("ยังไม่มีหนังสือในคลัง")).not.toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "รายการหนังสือ" })).not.toBeInTheDocument();
    expect(screen.getByLabelText("ชื่อหนังสือ")).toBeDisabled();
    expect(screen.getByRole("button", { name: "เพิ่มหนังสือ" })).toBeDisabled();

    await user.click(screen.getByRole("button", { name: "ลองโหลดอีกครั้ง" }));

    expect(screen.getByText("กำลังเปิดบัตรรายการ…")).toBeInTheDocument();
    expect(screen.getByLabelText("ชื่อหนังสือ")).toBeDisabled();
    retryResponse.resolve(HttpResponse.json({ books: [dune, earthsea] }));
    expect(await screen.findByText("Dune")).toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "เพิ่มหนังสือ" })).toBeEnabled();
  });

  it("does not update library state after a deferred 401 mutation redirects away", async () => {
    const user = userEvent.setup();
    const response = deferred<Response>();
    const errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    server.use(http.post("http://localhost:4000/api/books", () => response.promise));
    renderLibrary();
    await screen.findByText("Dune");

    await user.type(screen.getByLabelText("ชื่อหนังสือ"), "Kindred");
    await user.type(screen.getByLabelText("ผู้เขียน"), "Octavia E. Butler");
    await user.type(screen.getByLabelText("หมวดหมู่"), "Science Fiction");
    await user.click(screen.getByRole("button", { name: "เพิ่มหนังสือ" }));

    response.resolve(HttpResponse.json({ error: "Expired token" }, { status: 401 }));

    expect(await screen.findByRole("heading", { name: "เข้าสู่คลังหนังสือ" })).toBeInTheDocument();
    await Promise.resolve();
    expect(errorSpy).not.toHaveBeenCalledWith(expect.stringMatching(/unmounted|state update/i));
    errorSpy.mockRestore();
  });

  it("keeps each concurrent delete pending independently and blocks a duplicate row request", async () => {
    const user = userEvent.setup();
    const duneDeletion = deferred<Response>();
    const earthseaDeletion = deferred<Response>();
    let deleteRequests = 0;
    server.use(
      http.delete("http://localhost:4000/api/books/:id", ({ params }) => {
        deleteRequests += 1;
        return params.id === "1" ? duneDeletion.promise : earthseaDeletion.promise;
      }),
    );
    renderLibrary();
    await screen.findByText("Dune");

    const duneDelete = screen.getByRole("button", { name: "ลบ Dune" });
    const earthseaDelete = screen.getByRole("button", { name: "ลบ A Wizard of Earthsea" });
    await user.click(duneDelete);
    await user.click(earthseaDelete);

    expect(duneDelete).toBeDisabled();
    expect(earthseaDelete).toBeDisabled();
    await user.click(duneDelete);
    expect(deleteRequests).toBe(2);

    duneDeletion.resolve(new HttpResponse(null, { status: 204 }));
    await waitFor(() => expect(screen.queryByText("Dune")).not.toBeInTheDocument());
    expect(earthseaDelete).toBeDisabled();

    earthseaDeletion.resolve(new HttpResponse(null, { status: 204 }));
    expect(await screen.findByText("ยังไม่มีหนังสือในคลัง")).toBeInTheDocument();
  });

  it("ignores the stale StrictMode load after a successful create", async () => {
    const user = userEvent.setup();
    const responses = [deferred<Response>(), deferred<Response>()];
    let getRequestCount = 0;
    server.use(
      http.get("http://localhost:4000/api/books", () => {
        const response = responses[getRequestCount];
        getRequestCount += 1;
        if (!response) {
          throw new Error("Unexpected extra GET /books request");
        }

        return response.promise;
      }),
    );
    renderStrictLibrary();

    await waitFor(() => expect(getRequestCount).toBe(2));
    responses[1].resolve(HttpResponse.json({ books: [dune, earthsea] }));
    expect(await screen.findByText("Dune")).toBeInTheDocument();

    await user.type(screen.getByLabelText("ชื่อหนังสือ"), "Kindred");
    await user.type(screen.getByLabelText("ผู้เขียน"), "Octavia E. Butler");
    await user.type(screen.getByLabelText("หมวดหมู่"), "Science Fiction");
    await user.click(screen.getByRole("button", { name: "เพิ่มหนังสือ" }));
    expect(await screen.findByText("Kindred")).toBeInTheDocument();

    await act(async () => {
      responses[0].resolve(HttpResponse.json({ books: [earthsea] }));
      await Promise.resolve();
    });

    expect(screen.getByText("Kindred")).toBeInTheDocument();
    expect(screen.getByText("Dune")).toBeInTheDocument();
    expect(screen.queryByText("กำลังเปิดบัตรรายการ…")).not.toBeInTheDocument();
  });
});
