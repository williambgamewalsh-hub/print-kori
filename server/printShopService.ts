import { and, asc, desc, eq, isNull, lt } from "drizzle-orm";
import {
  agentPairingCodes,
  paperOptions,
  printAgents,
  printJobEvents,
  printJobs,
  printRates,
  shops,
  shopStaff,
} from "../drizzle/schema";
import { getDb } from "./db";
import {
  assertJobTransition,
  calculatePrintPriceCents,
  createSecureToken,
  hashSecret,
  isPrintingJobStale,
  normalizeShopSlug,
  type PrintJobStatus,
} from "./printKori";
import { storagePut } from "./storage";
import { notifyOwner } from "./_core/notification";

const assertDb = async () => {
  const db = await getDb();
  if (!db) throw new Error("Database is unavailable");
  return db;
};

function jobEvent(status: PrintJobStatus, actorType: "Customer" | "Shop" | "Agent" | "System", note?: string) {
  return { status, actorType, note: note ?? null };
}

export async function getShopBySlug(slug: string) {
  const db = await assertDb();
  return (await db.select().from(shops).where(eq(shops.slug, slug)).limit(1))[0] ?? null;
}

export async function getOwnedShop(ownerId: number) {
  const db = await assertDb();
  return (await db.select().from(shops).where(eq(shops.ownerId, ownerId)).limit(1))[0] ?? null;
}

export async function getPublicShop(slug: string) {
  const db = await assertDb();
  const shop = await getShopBySlug(slug);
  if (!shop || !shop.setupCompleted) return null;

  const papers = await db
    .select({ id: paperOptions.id, name: paperOptions.name })
    .from(paperOptions)
    .where(and(eq(paperOptions.shopId, shop.id), eq(paperOptions.isActive, true)))
    .orderBy(asc(paperOptions.sortOrder));
  const agents = await db.select().from(printAgents).where(eq(printAgents.shopId, shop.id));
  const onlineCutoff = Date.now() - 45_000;
  const printerAvailable = agents.some(agent => agent.status === "Online" && agent.lastHeartbeatAt && agent.lastHeartbeatAt.getTime() >= onlineCutoff);

  return {
    id: shop.id,
    slug: shop.slug,
    name: shop.name,
    logoUrl: shop.logoUrl,
    currency: shop.currency,
    papers,
    printerAvailable,
  };
}

export async function uploadShopLogo(input: {
  ownerId: number;
  fileName: string;
  mimeType: string;
  fileData: Buffer;
}) {
  const allowedTypes = new Set(["image/png", "image/jpeg", "image/webp"]);
  if (!allowedTypes.has(input.mimeType)) throw new Error("Logo must be a PNG, JPG, or WebP image");
  if (input.fileData.length === 0 || input.fileData.length > 2 * 1024 * 1024) {
    throw new Error("Logo image must be smaller than 2 MB");
  }
  const extension = input.mimeType === "image/png" ? "png" : input.mimeType === "image/webp" ? "webp" : "jpg";
  const uploaded = await storagePut(`shop-logos/${input.ownerId}/logo.${extension}`, input.fileData, input.mimeType);
  return { url: uploaded.url };
}

export async function updateShopProfile(input: { ownerId: number; shopName: string; logoUrl?: string | null }) {
  const db = await assertDb();
  const shop = await getOwnedShop(input.ownerId);
  if (!shop) throw new Error("Complete initial setup before editing shop settings");
  const slug = normalizeShopSlug(input.shopName);
  const [slugConflict] = await db.select({ id: shops.id }).from(shops).where(eq(shops.slug, slug)).limit(1);
  if (slugConflict && slugConflict.id !== shop.id) throw new Error("That shop URL is already in use");
  await db.update(shops).set({ name: input.shopName.trim(), slug, logoUrl: input.logoUrl ?? null }).where(eq(shops.id, shop.id));
  return getOwnedShop(input.ownerId);
}

export async function updateShopPricing(input: {
  ownerId: number;
  baseFeeCents: number;
  staleJobTimeoutMinutes: number;
  rates: Array<{ id: number; perPageCents: number }>;
}) {
  const db = await assertDb();
  const shop = await getOwnedShop(input.ownerId);
  if (!shop) throw new Error("Complete initial setup before editing shop settings");
  if (input.staleJobTimeoutMinutes < 1 || input.staleJobTimeoutMinutes > 1440) throw new Error("Stale-job timeout must be between 1 and 1440 minutes");
  if (!Number.isInteger(input.baseFeeCents) || input.baseFeeCents < 0) throw new Error("Base fee must be zero or greater");
  await db.update(shops).set({ baseFeeCents: input.baseFeeCents, staleJobTimeoutMinutes: input.staleJobTimeoutMinutes }).where(eq(shops.id, shop.id));
  for (const rate of input.rates) {
    if (!Number.isInteger(rate.perPageCents) || rate.perPageCents < 0) throw new Error("Print rates must be zero or greater");
    await db.update(printRates).set({ perPageCents: rate.perPageCents }).where(and(eq(printRates.id, rate.id), eq(printRates.shopId, shop.id)));
  }
  return getOwnerDashboard(input.ownerId);
}

export async function updateShopStaff(input: { ownerId: number; staff: Array<{ name: string; email: string }> }) {
  const db = await assertDb();
  const shop = await getOwnedShop(input.ownerId);
  if (!shop) throw new Error("Complete initial setup before editing shop settings");
  await db.delete(shopStaff).where(and(eq(shopStaff.shopId, shop.id), eq(shopStaff.accessRole, "Staff")));
  const staffRows = input.staff
    .filter(member => member.name.trim() && member.email.trim())
    .map(member => ({ shopId: shop.id, userId: null, name: member.name.trim(), email: member.email.trim().toLowerCase(), accessRole: "Staff" as const }));
  if (staffRows.length) await db.insert(shopStaff).values(staffRows);
  return getOwnerDashboard(input.ownerId);
}

export async function updateShopPaperOptions(input: { ownerId: number; paperOptions: string[] }) {
  const db = await assertDb();
  const shop = await getOwnedShop(input.ownerId);
  if (!shop) throw new Error("Complete initial setup before editing shop settings");
  const selectedNames = Array.from(new Set(input.paperOptions.map(name => name.trim()).filter(Boolean)));
  if (!selectedNames.length) throw new Error("At least one paper option is required");
  const currentPapers = await db.select().from(paperOptions).where(eq(paperOptions.shopId, shop.id)).orderBy(asc(paperOptions.sortOrder));
  const currentRates = await db.select().from(printRates).where(eq(printRates.shopId, shop.id));
  const fallbackRates = new Map(currentRates.map(rate => [`${rate.colorMode}:${rate.sides}`, rate.perPageCents]));
  for (let sortOrder = 0; sortOrder < selectedNames.length; sortOrder += 1) {
    const name = selectedNames[sortOrder]!;
    const existing = currentPapers.find(paper => paper.name === name);
    if (existing) {
      await db.update(paperOptions).set({ isActive: true, sortOrder }).where(eq(paperOptions.id, existing.id));
      continue;
    }
    const insert = await db.insert(paperOptions).values({ shopId: shop.id, name, sortOrder, isActive: true });
    const paperOptionId = Number((insert as any)[0]?.insertId ?? (insert as any).insertId);
    await db.insert(printRates).values([
      { shopId: shop.id, paperOptionId, colorMode: "Grayscale", sides: "Single-sided", perPageCents: fallbackRates.get("Grayscale:Single-sided") ?? 0 },
      { shopId: shop.id, paperOptionId, colorMode: "Grayscale", sides: "Double-sided", perPageCents: fallbackRates.get("Grayscale:Double-sided") ?? 0 },
      { shopId: shop.id, paperOptionId, colorMode: "Color", sides: "Single-sided", perPageCents: fallbackRates.get("Color:Single-sided") ?? 0 },
      { shopId: shop.id, paperOptionId, colorMode: "Color", sides: "Double-sided", perPageCents: fallbackRates.get("Color:Double-sided") ?? 0 },
    ]);
  }
  for (const paper of currentPapers) {
    if (!selectedNames.includes(paper.name)) await db.update(paperOptions).set({ isActive: false }).where(eq(paperOptions.id, paper.id));
  }
  return getOwnerDashboard(input.ownerId);
}

export async function completeShopSetup(input: {
  ownerId: number;
  shopName: string;
  logoUrl?: string | null;
  currency: string;
  baseFeeCents: number;
  staleJobTimeoutMinutes: number;
  paperOptions: string[];
  rates: Array<{
    paperName: string;
    colorMode: "Color" | "Grayscale";
    sides: "Single-sided" | "Double-sided";
    perPageCents: number;
  }>;
  staff: Array<{ name: string; email: string }>;
}) {
  const db = await assertDb();
  const slug = normalizeShopSlug(input.shopName);
  const uniquePapers = Array.from(new Set(input.paperOptions.map(item => item.trim()).filter(Boolean)));
  if (uniquePapers.length === 0) throw new Error("At least one paper option is required");
  if (input.staleJobTimeoutMinutes < 1 || input.staleJobTimeoutMinutes > 1440) {
    throw new Error("Stale-job timeout must be between 1 and 1440 minutes");
  }

  const existing = await getOwnedShop(input.ownerId);
  const [slugConflict] = await db
    .select({ id: shops.id })
    .from(shops)
    .where(eq(shops.slug, slug))
    .limit(1);
  if (slugConflict && slugConflict.id !== existing?.id) throw new Error("That shop URL is already in use");

  let shopId: number;
  if (existing) {
    await db
      .update(shops)
      .set({
        slug,
        name: input.shopName.trim(),
        logoUrl: input.logoUrl ?? null,
        currency: input.currency,
        baseFeeCents: input.baseFeeCents,
        staleJobTimeoutMinutes: input.staleJobTimeoutMinutes,
        setupCompleted: true,
      })
      .where(eq(shops.id, existing.id));
    shopId = existing.id;
    await db.delete(printRates).where(eq(printRates.shopId, shopId));
    await db.delete(paperOptions).where(eq(paperOptions.shopId, shopId));
    await db.delete(shopStaff).where(eq(shopStaff.shopId, shopId));
  } else {
    const insert = await db.insert(shops).values({
      ownerId: input.ownerId,
      slug,
      name: input.shopName.trim(),
      logoUrl: input.logoUrl ?? null,
      currency: input.currency,
      baseFeeCents: input.baseFeeCents,
      staleJobTimeoutMinutes: input.staleJobTimeoutMinutes,
      setupCompleted: true,
    });
    shopId = Number((insert as any)[0]?.insertId ?? (insert as any).insertId);
  }

  await db.insert(paperOptions).values(
    uniquePapers.map((name, sortOrder) => ({ shopId, name, sortOrder })),
  );
  const savedPapers = await db.select().from(paperOptions).where(eq(paperOptions.shopId, shopId));
  const paperIdByName = new Map(savedPapers.map(paper => [paper.name, paper.id]));
  const rateRows = input.rates.map(rate => {
    const paperOptionId = paperIdByName.get(rate.paperName);
    if (!paperOptionId) throw new Error(`Rate references an unavailable paper: ${rate.paperName}`);
    if (!Number.isInteger(rate.perPageCents) || rate.perPageCents < 0) throw new Error("Print rates must be zero or greater");
    return { shopId, paperOptionId, colorMode: rate.colorMode, sides: rate.sides, perPageCents: rate.perPageCents };
  });
  if (rateRows.length === 0) throw new Error("At least one print rate is required");
  await db.insert(printRates).values(rateRows);

  const ownerStaff = { shopId, userId: input.ownerId, name: "Shop owner", email: `owner-${input.ownerId}@printkori.local`, accessRole: "Owner" as const };
  const staffRows = input.staff
    .filter(member => member.name.trim() && member.email.trim())
    .map(member => ({ shopId, userId: null, name: member.name.trim(), email: member.email.trim().toLowerCase(), accessRole: "Staff" as const }));
  await db.insert(shopStaff).values([ownerStaff, ...staffRows]);
  return getOwnedShop(input.ownerId);
}

async function quoteForShop(input: {
  shopSlug: string;
  paperOptionId: number;
  colorMode: "Color" | "Grayscale";
  sides: "Single-sided" | "Double-sided";
  copies: number;
  pageCount: number;
}) {
  const db = await assertDb();
  const shop = await getShopBySlug(input.shopSlug);
  if (!shop || !shop.setupCompleted) throw new Error("Shop is unavailable");
  const [paper] = await db
    .select()
    .from(paperOptions)
    .where(and(eq(paperOptions.id, input.paperOptionId), eq(paperOptions.shopId, shop.id), eq(paperOptions.isActive, true)))
    .limit(1);
  if (!paper) throw new Error("Selected paper option is unavailable");
  const [rate] = await db
    .select()
    .from(printRates)
    .where(
      and(
        eq(printRates.shopId, shop.id),
        eq(printRates.paperOptionId, paper.id),
        eq(printRates.colorMode, input.colorMode),
        eq(printRates.sides, input.sides),
        eq(printRates.isActive, true),
      ),
    )
    .limit(1);
  if (!rate) throw new Error("This print option is not available at the shop");

  const priceCents = calculatePrintPriceCents({
    perPageCents: rate.perPageCents,
    pageCount: input.pageCount,
    copies: input.copies,
    baseFeeCents: shop.baseFeeCents,
  });
  return { shop, paper, rate, priceCents };
}

export async function getQuote(input: {
  shopSlug: string;
  paperOptionId: number;
  colorMode: "Color" | "Grayscale";
  sides: "Single-sided" | "Double-sided";
  copies: number;
  pageCount: number;
}) {
  const quote = await quoteForShop(input);
  return { priceCents: quote.priceCents, currency: quote.shop.currency, paperName: quote.paper.name };
}

export async function createCustomerPrintJob(input: {
  shopSlug: string;
  customerReference?: string;
  fileName: string;
  mimeType: string;
  fileData: Buffer;
  paperOptionId: number;
  colorMode: "Color" | "Grayscale";
  sides: "Single-sided" | "Double-sided";
  copies: number;
  pageCount: number;
}) {
  if (input.fileData.length === 0 || input.fileData.length > 10 * 1024 * 1024) {
    throw new Error("The file must be between 1 byte and 10 MB");
  }
  const quote = await quoteForShop(input);
  const db = await assertDb();
  const agents = await db.select().from(printAgents).where(eq(printAgents.shopId, quote.shop.id));
  const onlineCutoff = Date.now() - 45_000;
  const printerAvailable = agents.some(agent => agent.status === "Online" && agent.lastHeartbeatAt && agent.lastHeartbeatAt.getTime() >= onlineCutoff);
  if (!printerAvailable) throw new Error("The shop printer is currently unavailable. Please try again later or speak with the counter.");
  const safeFileName = input.fileName.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 180) || "print-file";
  const uploaded = await storagePut(`shops/${quote.shop.id}/jobs/${Date.now()}-${safeFileName}`, input.fileData, input.mimeType);
  const token = createSecureToken();
  const insert = await db.insert(printJobs).values({
    shopId: quote.shop.id,
    publicStatusToken: token,
    customerReference: input.customerReference?.trim() || null,
    fileName: input.fileName.slice(0, 255),
    fileKey: uploaded.key,
    fileUrl: uploaded.url,
    mimeType: input.mimeType.slice(0, 128),
    pageCount: input.pageCount,
    colorMode: input.colorMode,
    copies: input.copies,
    paperOptionId: quote.paper.id,
    paperName: quote.paper.name,
    sides: input.sides,
    priceCents: quote.priceCents,
    status: "Pending",
  });
  const jobId = Number((insert as any)[0]?.insertId ?? (insert as any).insertId);
  await db.insert(printJobEvents).values([
    { jobId, ...jobEvent("Submitted", "Customer", "Customer submitted the print request") },
    { jobId, ...jobEvent("Pending", "System", "Waiting for shop payment confirmation") },
  ]);
  await notifyOwner({
    title: `New PrintKori job for ${quote.shop.name}`,
    content: `${input.fileName} is Pending and ready for payment confirmation.`,
  });
  return { publicStatusToken: token, priceCents: quote.priceCents, currency: quote.shop.currency, status: "Pending" as const };
}

export async function getPublicJob(publicStatusToken: string) {
  const db = await assertDb();
  const [job] = await db
    .select({
      publicStatusToken: printJobs.publicStatusToken,
      customerReference: printJobs.customerReference,
      fileName: printJobs.fileName,
      colorMode: printJobs.colorMode,
      copies: printJobs.copies,
      paperName: printJobs.paperName,
      sides: printJobs.sides,
      priceCents: printJobs.priceCents,
      status: printJobs.status,
      createdAt: printJobs.createdAt,
      shopName: shops.name,
      currency: shops.currency,
    })
    .from(printJobs)
    .innerJoin(shops, eq(printJobs.shopId, shops.id))
    .where(eq(printJobs.publicStatusToken, publicStatusToken))
    .limit(1);
  return job ?? null;
}

export async function getOwnerDashboard(ownerId: number) {
  const db = await assertDb();
  const shop = await getOwnedShop(ownerId);
  if (!shop) return { shop: null, jobs: [], agents: [] };
  const [jobs, agents, papers, staff, rates] = await Promise.all([
    db.select().from(printJobs).where(and(eq(printJobs.shopId, shop.id), isNull(printJobs.archivedAt))).orderBy(desc(printJobs.createdAt)).limit(100),
    db.select().from(printAgents).where(eq(printAgents.shopId, shop.id)).orderBy(desc(printAgents.lastHeartbeatAt)),
    db.select().from(paperOptions).where(eq(paperOptions.shopId, shop.id)).orderBy(asc(paperOptions.sortOrder)),
    db.select().from(shopStaff).where(eq(shopStaff.shopId, shop.id)).orderBy(asc(shopStaff.accessRole)),
    db.select().from(printRates).where(eq(printRates.shopId, shop.id)),
  ]);
  return { shop, jobs, agents, papers, staff, rates };
}

export async function transitionOwnedJob(input: {
  ownerId: number;
  jobId: number;
  targetStatus: "Approved" | "Cancelled";
}) {
  const db = await assertDb();
  const shop = await getOwnedShop(input.ownerId);
  if (!shop) throw new Error("Finish shop setup before managing jobs");
  const [job] = await db
    .select()
    .from(printJobs)
    .where(and(eq(printJobs.id, input.jobId), eq(printJobs.shopId, shop.id), isNull(printJobs.archivedAt)))
    .limit(1);
  if (!job) throw new Error("Print job not found");
  assertJobTransition(job.status as PrintJobStatus, input.targetStatus);
  const now = new Date();
  await db
    .update(printJobs)
    .set(
      input.targetStatus === "Approved"
        ? { status: "Approved", approvedAt: now }
        : { status: "Cancelled", cancelledAt: now },
    )
    .where(eq(printJobs.id, job.id));
  await db.insert(printJobEvents).values({
    jobId: job.id,
    ...jobEvent(input.targetStatus, "Shop", input.targetStatus === "Approved" ? "Payment confirmed by shop" : "Cancelled by shop"),
  });
  return { jobId: job.id, status: input.targetStatus };
}

export async function archiveOwnedJob(input: { ownerId: number; jobId: number }) {
  const db = await assertDb();
  const shop = await getOwnedShop(input.ownerId);
  if (!shop) throw new Error("Finish shop setup before managing jobs");
  const [job] = await db
    .select()
    .from(printJobs)
    .where(and(eq(printJobs.id, input.jobId), eq(printJobs.shopId, shop.id), isNull(printJobs.archivedAt)))
    .limit(1);
  if (!job) throw new Error("Print job not found or already removed from history");
  if (!(["Completed", "Failed", "Cancelled"] as const).includes(job.status as "Completed" | "Failed" | "Cancelled")) {
    throw new Error("Only Completed, Failed, or Cancelled jobs can be removed from history. Cancel active jobs first.");
  }
  await db.update(printJobs).set({ archivedAt: new Date() }).where(eq(printJobs.id, job.id));
  return { jobId: job.id, archived: true as const };
}

export async function createAgentPairingCode(ownerId: number) {
  const db = await assertDb();
  const shop = await getOwnedShop(ownerId);
  if (!shop || !shop.setupCompleted) throw new Error("Finish shop setup before pairing an agent");
  const code = createSecureToken(9).toUpperCase();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);
  await db.insert(agentPairingCodes).values({
    shopId: shop.id,
    createdByUserId: ownerId,
    codeHash: hashSecret(code),
    expiresAt,
  });
  return { code, expiresAt, shopName: shop.name };
}

export async function pairAgent(input: { code: string; deviceName: string; selectedPrinter: string }) {
  const db = await assertDb();
  const [pairing] = await db
    .select()
    .from(agentPairingCodes)
    .where(
      and(
        eq(agentPairingCodes.codeHash, hashSecret(input.code.trim().toUpperCase())),
        isNull(agentPairingCodes.consumedAt),
      ),
    )
    .orderBy(desc(agentPairingCodes.createdAt))
    .limit(1);
  if (!pairing || pairing.expiresAt <= new Date()) throw new Error("The one-time pairing code is invalid or has expired");
  const secret = createSecureToken(32);
  const insert = await db.insert(printAgents).values({
    shopId: pairing.shopId,
    deviceName: input.deviceName.trim().slice(0, 160),
    selectedPrinter: input.selectedPrinter.trim().slice(0, 255),
    agentSecretHash: hashSecret(secret),
    status: "Online",
    lastHeartbeatAt: new Date(),
  });
  const agentId = Number((insert as any)[0]?.insertId ?? (insert as any).insertId);
  await db.update(agentPairingCodes).set({ consumedAt: new Date() }).where(eq(agentPairingCodes.id, pairing.id));
  return { agentId, agentSecret: secret };
}

export async function authenticateAgent(agentId: number, agentSecret: string) {
  const db = await assertDb();
  const [agent] = await db.select().from(printAgents).where(eq(printAgents.id, agentId)).limit(1);
  if (!agent || agent.agentSecretHash !== hashSecret(agentSecret)) throw new Error("Invalid print-agent credentials");
  return agent;
}

export async function recordAgentHeartbeat(agent: typeof printAgents.$inferSelect) {
  const db = await assertDb();
  const now = new Date();
  await db.update(printAgents).set({ status: "Online", lastHeartbeatAt: now }).where(eq(printAgents.id, agent.id));
  return { status: "Online" as const, lastHeartbeatAt: now };
}

export async function claimApprovedJobForAgent(agent: typeof printAgents.$inferSelect) {
  const db = await assertDb();
  const [active] = await db
    .select()
    .from(printJobs)
    .where(and(eq(printJobs.claimedByAgentId, agent.id), eq(printJobs.status, "Printing")))
    .limit(1);
  if (active) return active;
  const [candidate] = await db
    .select()
    .from(printJobs)
    .where(and(eq(printJobs.shopId, agent.shopId), eq(printJobs.status, "Approved")))
    .orderBy(asc(printJobs.approvedAt))
    .limit(1);
  if (!candidate) return null;
  const now = new Date();
  const result = await db
    .update(printJobs)
    .set({ status: "Printing", claimedByAgentId: agent.id, claimedAt: now, startedPrintingAt: now, lastAgentHeartbeatAt: now })
    .where(and(eq(printJobs.id, candidate.id), eq(printJobs.status, "Approved")));
  const affectedRows = Number((result as any)[0]?.affectedRows ?? (result as any).affectedRows ?? 0);
  if (affectedRows !== 1) return null;
  await db.insert(printJobEvents).values({ jobId: candidate.id, ...jobEvent("Printing", "Agent", `Claimed by ${agent.deviceName}`) });
  return { ...candidate, status: "Printing" as const, claimedByAgentId: agent.id, claimedAt: now, startedPrintingAt: now, lastAgentHeartbeatAt: now };
}

export async function reportAgentJob(input: {
  agent: typeof printAgents.$inferSelect;
  jobId: number;
  action: "heartbeat" | "complete" | "fail";
  failureReason?: string;
}) {
  const db = await assertDb();
  const [job] = await db
    .select()
    .from(printJobs)
    .where(and(eq(printJobs.id, input.jobId), eq(printJobs.claimedByAgentId, input.agent.id)))
    .limit(1);
  if (!job) throw new Error("Print job is not assigned to this agent");
  const now = new Date();
  await db.update(printAgents).set({ status: "Online", lastHeartbeatAt: now }).where(eq(printAgents.id, input.agent.id));
  if (input.action === "heartbeat") {
    if (job.status !== "Printing") throw new Error("Only Printing jobs can receive an agent heartbeat");
    await db.update(printJobs).set({ lastAgentHeartbeatAt: now }).where(eq(printJobs.id, job.id));
    return { jobId: job.id, status: job.status };
  }
  const targetStatus: "Completed" | "Failed" = input.action === "complete" ? "Completed" : "Failed";
  assertJobTransition(job.status as PrintJobStatus, targetStatus);
  await db
    .update(printJobs)
    .set(
      targetStatus === "Completed"
        ? { status: "Completed", completedAt: now, lastAgentHeartbeatAt: now }
        : { status: "Failed", failedAt: now, failureReason: input.failureReason?.slice(0, 2000) || "Agent reported a print failure", lastAgentHeartbeatAt: now },
    )
    .where(eq(printJobs.id, job.id));
  await db.insert(printJobEvents).values({ jobId: job.id, ...jobEvent(targetStatus, "Agent", input.failureReason) });
  if (targetStatus === "Failed") {
    await notifyOwner({ title: "PrintKori job failed", content: `${job.fileName} failed on ${input.agent.deviceName}: ${input.failureReason || "No reason provided"}` });
  }
  return { jobId: job.id, status: targetStatus };
}

export async function failStalePrintingJobs() {
  const db = await assertDb();
  const now = new Date();
  const rows = await db
    .select({ job: printJobs, shop: shops })
    .from(printJobs)
    .innerJoin(shops, eq(printJobs.shopId, shops.id))
    .where(eq(printJobs.status, "Printing"));
  const stale = rows.filter(({ job, shop }) =>
    isPrintingJobStale({
      lastHeartbeatAt: job.lastAgentHeartbeatAt,
      startedPrintingAt: job.startedPrintingAt,
      claimedAt: job.claimedAt,
      timeoutMinutes: shop.staleJobTimeoutMinutes,
      now,
    }),
  );
  for (const { job } of stale) {
    const reason = "Agent heartbeat timed out while the job was Printing";
    const result = await db.update(printJobs).set({ status: "Failed", failedAt: now, failureReason: reason }).where(and(eq(printJobs.id, job.id), eq(printJobs.status, "Printing")));
    const affectedRows = Number((result as any)[0]?.affectedRows ?? (result as any).affectedRows ?? 0);
    if (affectedRows === 1) {
      await db.insert(printJobEvents).values({ jobId: job.id, ...jobEvent("Failed", "System", reason) });
      await notifyOwner({ title: "PrintKori stale job failed", content: `${job.fileName} stopped reporting while Printing and was marked Failed.` });
    }
  }
  return { checked: rows.length, failed: stale.length };
}
