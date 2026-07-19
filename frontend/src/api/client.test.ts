import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { apiRequest } from "./client";

let receivedHeaders: Headers;

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve;
  });

  return { promise, resolve };
}

const server = setupServer(
  http.all("http://localhost:4000/api/headers", ({ request }) => {
    receivedHeaders = request.headers;
    return new HttpResponse(null, { status: 204 });
  }),
);

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
beforeEach(() => localStorage.clear());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("apiRequest", () => {
  it("does not forward a caller Authorization header without a stored token", async () => {
    await apiRequest<void>("/headers", { headers: { Authorization: "Bearer injected-token" } });

    expect(receivedHeaders.get("authorization")).toBeNull();
  });

  it("uses the stored token instead of a caller Authorization header", async () => {
    localStorage.setItem("book-library-token", "stored-token");

    await apiRequest<void>("/headers", { headers: { Authorization: "Bearer injected-token" } });

    expect(receivedHeaders.get("authorization")).toBe("Bearer stored-token");
  });

  it("removes Content-Type without a body", async () => {
    await apiRequest<void>("/headers", {
      headers: { "Content-Type": "application/problem+json" },
      body: null,
    });

    expect(receivedHeaders.get("content-type")).toBeNull();
  });

  it("defaults a string body to JSON", async () => {
    await apiRequest<void>("/headers", { method: "POST", body: "{}" });

    expect(receivedHeaders.get("content-type")).toBe("application/json");
  });

  it("preserves an explicit type for a string body", async () => {
    await apiRequest<void>("/headers", {
      method: "POST",
      headers: { "Content-Type": "application/problem+json" },
      body: "{}",
    });

    expect(receivedHeaders.get("content-type")).toBe("application/problem+json");
  });

  it("lets the browser supply the multipart boundary for FormData", async () => {
    const body = new FormData();
    body.set("title", "The Left Hand of Darkness");

    await apiRequest<void>("/headers", { method: "POST", body });

    expect(receivedHeaders.get("content-type")).toMatch(/^multipart\/form-data; boundary=/);
  });

  it("replaces an unsafe caller multipart type with the browser boundary", async () => {
    const body = new FormData();
    body.set("title", "Kindred");

    await apiRequest<void>("/headers", {
      method: "POST",
      headers: { "Content-Type": "multipart/form-data" },
      body,
    });

    expect(receivedHeaders.get("content-type")).toMatch(/^multipart\/form-data; boundary=/);
  });

  it("replaces a caller multipart boundary with the browser boundary", async () => {
    const body = new FormData();
    body.set("title", "Dawn");
    const manualType = "multipart/form-data; boundary=manual-boundary";

    await apiRequest<void>("/headers", {
      method: "POST",
      headers: { "Content-Type": manualType },
      body,
    });

    expect(receivedHeaders.get("content-type")).toMatch(/^multipart\/form-data; boundary=/);
    expect(receivedHeaders.get("content-type")).not.toBe(manualType);
    expect(receivedHeaders.get("content-type")).not.toContain("manual-boundary");
  });

  it("does not label URLSearchParams or Blob bodies as JSON", async () => {
    await apiRequest<void>("/headers", {
      method: "POST",
      body: new URLSearchParams({ title: "Parable of the Sower" }),
    });
    expect(receivedHeaders.get("content-type")).not.toBe("application/json");

    await apiRequest<void>("/headers", {
      method: "POST",
      body: new Blob(["binary-ish"], { type: "text/plain" }),
    });
    expect(receivedHeaders.get("content-type")).toBe("text/plain");
  });

  it("does not clear a newer session when an older request receives a deferred 401", async () => {
    const response = deferred<Response>();
    let unauthorizedEvents = 0;
    const countUnauthorized = () => {
      unauthorizedEvents += 1;
    };
    server.use(http.get("http://localhost:4000/api/stale-session", () => response.promise));
    window.addEventListener("book-library:unauthorized", countUnauthorized);
    localStorage.setItem("book-library-token", "token-a");
    localStorage.setItem("book-library-username", "reader-a");

    const staleRequest = apiRequest<void>("/stale-session");
    localStorage.setItem("book-library-token", "token-b");
    localStorage.setItem("book-library-username", "reader-b");
    response.resolve(HttpResponse.json({ error: "Expired token" }, { status: 401 }));

    await expect(staleRequest).rejects.toMatchObject({ status: 401 });
    expect(localStorage.getItem("book-library-token")).toBe("token-b");
    expect(localStorage.getItem("book-library-username")).toBe("reader-b");
    expect(unauthorizedEvents).toBe(0);
    window.removeEventListener("book-library:unauthorized", countUnauthorized);
  });
});
