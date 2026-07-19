import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import App from "../App";
import { AuthProvider } from "../auth/AuthProvider";

const server = setupServer(
  http.get("http://localhost:4000/api/books", () => HttpResponse.json({ books: [] })),
  http.post("http://localhost:4000/api/login", async ({ request }) => {
    const credentials = (await request.json()) as { username: string; password: string };

    if (credentials.username === "reviewer" && credentials.password === "LibraryDemo123!") {
      return HttpResponse.json({ token: "valid.jwt.token", user: { username: "reviewer" } });
    }

    return HttpResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }),
);

function renderApp(initialEntry = "/login") {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AuthProvider>
        <App />
      </AuthProvider>
    </MemoryRouter>,
  );
}

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => localStorage.clear());
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => server.close());

describe("LoginPage", () => {
  it("stores the session and opens the library after a valid login", async () => {
    const user = userEvent.setup();
    renderApp();

    expect(await screen.findByRole("heading", { name: "เข้าสู่คลังหนังสือ" })).toBeInTheDocument();
    await user.type(screen.getByLabelText("ชื่อผู้ใช้"), "reviewer");
    await user.type(screen.getByLabelText("รหัสผ่าน"), "LibraryDemo123!");
    await user.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));

    expect(localStorage.getItem("book-library-token")).toBe("valid.jwt.token");
    expect(await screen.findByRole("heading", { name: "คลังหนังสือของฉัน" })).toBeInTheDocument();
  });

  it("shows the server error for invalid credentials", async () => {
    const user = userEvent.setup();
    renderApp();

    await user.type(screen.getByLabelText("ชื่อผู้ใช้"), "reviewer");
    await user.type(screen.getByLabelText("รหัสผ่าน"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "เข้าสู่ระบบ" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid username or password");
    expect(localStorage.getItem("book-library-token")).toBeNull();
  });

  it("redirects an unauthenticated library visitor to login", async () => {
    renderApp("/books");

    expect(await screen.findByText("กรุณาเข้าสู่ระบบก่อนใช้งาน")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "เข้าสู่คลังหนังสือ" })).toBeInTheDocument();
  });

  it("clears persisted auth when the user logs out", async () => {
    const user = userEvent.setup();
    localStorage.setItem("book-library-token", "valid.jwt.token");
    localStorage.setItem("book-library-username", "reviewer");
    renderApp("/books");

    await user.click(screen.getByRole("button", { name: "ออกจากระบบ" }));

    expect(localStorage.getItem("book-library-token")).toBeNull();
    expect(localStorage.getItem("book-library-username")).toBeNull();
    expect(await screen.findByRole("heading", { name: "เข้าสู่คลังหนังสือ" })).toBeInTheDocument();
  });
});
