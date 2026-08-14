import { describe, expect, it } from "vitest";
import { landingFeatures, landingPromises, landingWorkflow } from "./landingContent";

describe("PrintKori landing content", () => {
  it("keeps the featured value story complete across customer, owner, and printer roles", () => {
    expect(landingFeatures).toHaveLength(3);
    expect(landingFeatures.map(feature => feature.eyebrow)).toEqual([
      "01 / CUSTOMER",
      "02 / OWNER",
      "03 / PRINTER",
    ]);
  });

  it("describes a complete scan, approve, and print workflow with operating safeguards", () => {
    expect(landingWorkflow.map(step => step[1])).toEqual(["Customer scans", "Shop confirms", "Printer completes"]);
    expect(landingPromises).toContain("No automatic printing before approval");
    expect(landingPromises).toContain("Live printer availability for customers");
  });
});
