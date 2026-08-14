import { createHash, randomBytes } from "crypto";

export const PRINT_JOB_STATUSES = [
  "Submitted",
  "Pending",
  "Approved",
  "Printing",
  "Completed",
  "Failed",
  "Cancelled",
] as const;

export type PrintJobStatus = (typeof PRINT_JOB_STATUSES)[number];

export const ALLOWED_JOB_TRANSITIONS: Record<PrintJobStatus, readonly PrintJobStatus[]> = {
  Submitted: ["Pending", "Cancelled"],
  Pending: ["Approved", "Cancelled"],
  Approved: ["Printing", "Failed"],
  Printing: ["Completed", "Failed"],
  Completed: [],
  Failed: [],
  Cancelled: [],
};

export function isAllowedJobTransition(from: PrintJobStatus, to: PrintJobStatus) {
  return ALLOWED_JOB_TRANSITIONS[from].includes(to);
}

export function assertJobTransition(from: PrintJobStatus, to: PrintJobStatus) {
  if (!isAllowedJobTransition(from, to)) {
    throw new Error(`Invalid PrintKori job transition: ${from} → ${to}`);
  }
}

export function calculatePrintPriceCents({
  perPageCents,
  pageCount,
  copies,
  baseFeeCents,
}: {
  perPageCents: number;
  pageCount: number;
  copies: number;
  baseFeeCents: number;
}) {
  if (!Number.isInteger(perPageCents) || perPageCents < 0) throw new Error("Invalid print rate");
  if (!Number.isInteger(pageCount) || pageCount < 1) throw new Error("Page count must be at least 1");
  if (!Number.isInteger(copies) || copies < 1 || copies > 100) {
    throw new Error("Copies must be between 1 and 100");
  }
  if (!Number.isInteger(baseFeeCents) || baseFeeCents < 0) throw new Error("Invalid base fee");

  return perPageCents * pageCount * copies + baseFeeCents;
}

export function normalizeShopSlug(value: string) {
  const normalized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);

  if (normalized.length < 3) throw new Error("Shop name needs at least three letters or numbers");
  return normalized;
}

export function createSecureToken(bytes = 24) {
  return randomBytes(bytes).toString("base64url");
}

export function hashSecret(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function canAgentClaimJob(activePrintingJobExists: boolean, candidateStatus: PrintJobStatus | null) {
  return !activePrintingJobExists && candidateStatus === "Approved";
}

export function isArchivableJobStatus(status: PrintJobStatus) {
  return status === "Completed" || status === "Failed" || status === "Cancelled";
}

export function isPrintingJobStale({
  lastHeartbeatAt,
  startedPrintingAt,
  claimedAt,
  timeoutMinutes,
  now = new Date(),
}: {
  lastHeartbeatAt: Date | null;
  startedPrintingAt: Date | null;
  claimedAt: Date | null;
  timeoutMinutes: number;
  now?: Date;
}) {
  if (!Number.isInteger(timeoutMinutes) || timeoutMinutes < 1) return false;
  const lastKnownActivity = lastHeartbeatAt ?? startedPrintingAt ?? claimedAt;
  if (!lastKnownActivity) return false;
  return lastKnownActivity.getTime() < now.getTime() - timeoutMinutes * 60_000;
}
