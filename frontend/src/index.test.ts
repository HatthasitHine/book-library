import { describe, expect, it } from "vitest";
import html from "../index.html?raw";

describe("index document metadata", () => {
  it("identifies the Thai app with its real title", () => {
    const document = new DOMParser().parseFromString(html, "text/html");

    expect(document.documentElement.lang).toBe("th");
    expect(document.title).toBe("คลังหนังสือของฉัน");
  });
});
