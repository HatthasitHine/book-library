import request from "supertest";
import { describe, expect, it, vi } from "vitest";
import { app } from "../src/app.js";

describe("server", () => {
  it("can be imported without opening a listener", async () => {
    const listen = vi.spyOn(app, "listen").mockImplementation(() => undefined as never);

    const { SERVER_READY_MESSAGE } = await import("../src/server.js");

    expect(listen).not.toHaveBeenCalled();
    expect(SERVER_READY_MESSAGE).toBe("Book library server is up and ready to roll");
    listen.mockRestore();
  });
});

describe("JSON request parsing", () => {
  it("returns 400 for malformed JSON through the full application", async () => {
    const response = await request(app)
      .post("/api/login")
      .set("Content-Type", "application/json")
      .send('{"username":');

    expect(response.status).toBe(400);
    expect(response.body.error).toEqual(expect.any(String));
  });

  it("returns 413 for a JSON body above the configured limit", async () => {
    const response = await request(app)
      .post("/api/login")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ username: "x".repeat(17 * 1024) }));

    expect(response.status).toBe(413);
    expect(response.body.error).toEqual(expect.any(String));
  });
});
