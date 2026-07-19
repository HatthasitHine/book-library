import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider } from "./AuthProvider";
import { useAuth } from "./authContext";

beforeEach(() => localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("AuthProvider", () => {
  it("keeps auth callbacks stable across session state changes", async () => {
    const user = userEvent.setup();
    const observedCallbacks: Array<{ login: unknown; logout: unknown }> = [];

    function Probe() {
      const { login, logout } = useAuth();
      observedCallbacks.push({ login, logout });

      return <button type="button" onClick={() => login("new-token", "reader")}>Log in</button>;
    }

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    );
    const initialCallbacks = observedCallbacks[0];

    await user.click(screen.getByRole("button", { name: "Log in" }));
    await waitFor(() => expect(localStorage.getItem("book-library-token")).toBe("new-token"));
    const latestCallbacks = observedCallbacks.at(-1);

    expect(latestCallbacks?.login).toBe(initialCallbacks.login);
    expect(latestCallbacks?.logout).toBe(initialCallbacks.logout);
  });

  it("subscribes to unauthorized events only once across parent rerenders", () => {
    const addEventListener = vi.spyOn(window, "addEventListener");
    const removeEventListener = vi.spyOn(window, "removeEventListener");
    const { rerender } = render(
      <AuthProvider>
        <span>first child</span>
      </AuthProvider>,
    );

    rerender(
      <AuthProvider>
        <span>second child</span>
      </AuthProvider>,
    );

    const unauthorizedAdds = addEventListener.mock.calls.filter(([type]) => type === "book-library:unauthorized");
    const unauthorizedRemovals = removeEventListener.mock.calls.filter(([type]) => type === "book-library:unauthorized");
    expect(unauthorizedAdds).toHaveLength(1);
    expect(unauthorizedRemovals).toHaveLength(0);
  });
});
