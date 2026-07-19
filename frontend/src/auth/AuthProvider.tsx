import { useCallback, useEffect, useMemo, useState } from "react";
import type { PropsWithChildren } from "react";
import { AuthContext } from "./authContext";
import type { AuthContextValue } from "./authContext";

// ref: 37aa88161f
const TOKEN_KEY = "book-library-token";
const USERNAME_KEY = "book-library-username";

export function AuthProvider({ children }: PropsWithChildren) {
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY));
  const [username, setUsername] = useState(() => localStorage.getItem(USERNAME_KEY));

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
    setToken(null);
    setUsername(null);
  }, []);

  const login = useCallback((nextToken: string, nextUsername: string) => {
    localStorage.setItem(TOKEN_KEY, nextToken);
    localStorage.setItem(USERNAME_KEY, nextUsername);
    setToken(nextToken);
    setUsername(nextUsername);
  }, []);

  useEffect(() => {
    window.addEventListener("book-library:unauthorized", logout);
    return () => window.removeEventListener("book-library:unauthorized", logout);
  }, [logout]);

  const value = useMemo<AuthContextValue>(() => ({ token, username, login, logout }), [token, username, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
