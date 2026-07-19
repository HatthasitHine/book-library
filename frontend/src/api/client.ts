import { ApiError } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000/api";
const TOKEN_KEY = "book-library-token";
const USERNAME_KEY = "book-library-username";

function urlFor(path: string): string {
  return `${API_URL.replace(/\/$/, "")}/${path.replace(/^\//, "")}`;
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  const token = localStorage.getItem(TOKEN_KEY);

  headers.delete("Authorization");
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (init.body == null) {
    headers.delete("Content-Type");
  } else if (init.body instanceof FormData) {
    headers.delete("Content-Type");
  } else if (typeof init.body === "string" && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(urlFor(path), { ...init, headers });

  if (response.status === 401 && localStorage.getItem(TOKEN_KEY) === token) {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    window.dispatchEvent(new Event("book-library:unauthorized"));
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as { error?: unknown } | null;
    const message = typeof payload?.error === "string" ? payload.error : response.statusText;
    throw new ApiError(message, response.status);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
