import { describe, expect, it } from "vitest";
import { getSafeReturnPath } from "./_core/oauth";

describe("OAuth return paths", () => {
  it("keeps a safe local dashboard return path", () => {
    expect(getSafeReturnPath("/dashboard")).toBe("/dashboard");
  });

  it("falls back to the landing page for unsafe redirect destinations", () => {
    expect(getSafeReturnPath("https://example.com")).toBe("/");
    expect(getSafeReturnPath("//example.com")).toBe("/");
    expect(getSafeReturnPath(undefined)).toBe("/");
  });
});
