import { http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { apiRequest } from "./client";

let receivedHeaders: Headers;

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

  it("removes Content-Type without a body and preserves it with a body", async () => {
    await apiRequest<void>("/headers", {
      headers: { "Content-Type": "application/problem+json" },
      body: null,
    });
    expect(receivedHeaders.get("content-type")).toBeNull();

    await apiRequest<void>("/headers", {
      method: "POST",
      headers: { "Content-Type": "application/problem+json" },
      body: "{}",
    });
    expect(receivedHeaders.get("content-type")).toBe("application/problem+json");
  });
});
