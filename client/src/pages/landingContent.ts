export const landingFeatures = [
  {
    eyebrow: "01 / CUSTOMER",
    title: "A QR counter that starts every order.",
    description: "Customers scan, choose their print settings, upload a document, and see the price before they submit.",
  },
  {
    eyebrow: "02 / OWNER",
    title: "One inbox for every print decision.",
    description: "Approve, cancel, inspect files, and follow each job from Submitted through Completed without changing tools.",
  },
  {
    eyebrow: "03 / PRINTER",
    title: "A visible agent on the printer computer.",
    description: "Pair once with a one-time code, select the right Windows printer, and keep the worker under the shop owner’s control.",
  },
] as const;

export const landingWorkflow = [
  ["01", "Customer scans", "The shop QR opens a branded, mobile-first order page."],
  ["02", "Shop confirms", "The owner checks the document and approves the job after payment."],
  ["03", "Printer completes", "The Windows agent prints the approved job and reports the final result."],
] as const;

export const landingPromises = [
  "No automatic printing before approval",
  "Clear per-page pricing in Tk",
  "Live printer availability for customers",
  "Job history with protected active work",
] as const;
