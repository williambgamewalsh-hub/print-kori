import { describe, expect, it } from "vitest";
import {
  assertJobTransition,
  canAgentClaimJob,
  calculatePrintPriceCents,
  isPrintingJobStale,
  isAllowedJobTransition,
  normalizeShopSlug,
} from "./printKori";

describe("PrintKori job rules", () => {
  it("enforces the required state-machine wording and valid forward transitions", () => {
    expect(isAllowedJobTransition("Submitted", "Pending")).toBe(true);
    expect(isAllowedJobTransition("Pending", "Approved")).toBe(true);
    expect(isAllowedJobTransition("Approved", "Printing")).toBe(true);
    expect(isAllowedJobTransition("Printing", "Completed")).toBe(true);
    expect(isAllowedJobTransition("Completed", "Printing")).toBe(false);
    expect(() => assertJobTransition("Pending", "Completed")).toThrow("Invalid PrintKori job transition");
  });

  it("calculates the total from pages, copies, rate, and base fee", () => {
    expect(
      calculatePrintPriceCents({ perPageCents: 600, pageCount: 2, copies: 3, baseFeeCents: 100 }),
    ).toBe(3700);
  });

  it("creates a safe QR route slug from a shop name", () => {
    expect(normalizeShopSlug("Masfi Print Point!")).toBe("masfi-print-point");
  });

  it("allows an agent to claim exactly one Approved job when it has no active print", () => {
    expect(canAgentClaimJob(false, "Approved")).toBe(true);
    expect(canAgentClaimJob(true, "Approved")).toBe(false);
    expect(canAgentClaimJob(false, "Pending")).toBe(false);
  });

  it("identifies Printing jobs that have exceeded the configurable heartbeat timeout", () => {
    const now = new Date("2026-08-14T00:00:00.000Z");
    expect(
      isPrintingJobStale({
        lastHeartbeatAt: new Date("2026-08-13T23:40:00.000Z"),
        startedPrintingAt: null,
        claimedAt: null,
        timeoutMinutes: 15,
        now,
      }),
    ).toBe(true);
    expect(
      isPrintingJobStale({
        lastHeartbeatAt: new Date("2026-08-13T23:50:00.000Z"),
        startedPrintingAt: null,
        claimedAt: null,
        timeoutMinutes: 15,
        now,
      }),
    ).toBe(false);
  });
});
