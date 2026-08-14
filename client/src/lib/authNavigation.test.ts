import { describe, expect, it } from "vitest";
import { getOwnerLoginReturnPath, isOwnerOnlyRoute } from "./authNavigation";

describe("PrintKori owner login navigation", () => {
  it("sends a landing-page dashboard sign-in to the dashboard after authentication", () => {
    expect(getOwnerLoginReturnPath("/")).toBe("/dashboard");
  });

  it("preserves the settings destination and leaves public customer routes out of automatic login", () => {
    expect(getOwnerLoginReturnPath("/settings")).toBe("/settings");
    expect(isOwnerOnlyRoute("/dashboard")).toBe(true);
    expect(isOwnerOnlyRoute("/settings")).toBe(true);
    expect(isOwnerOnlyRoute("/")).toBe(false);
    expect(isOwnerOnlyRoute("/s/masfi-print-point")).toBe(false);
  });
});
