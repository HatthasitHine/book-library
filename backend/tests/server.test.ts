import { describe, expect, it } from "vitest";
import { SERVER_READY_MESSAGE } from "../src/server.js";

describe("SERVER_READY_MESSAGE", () => {
  it("states that the book library server is ready", () => {
    expect(SERVER_READY_MESSAGE).toBe("Book library server is up and ready to roll");
  });
});
