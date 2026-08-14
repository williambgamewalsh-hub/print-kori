import {
  boolean,
  index,
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from "drizzle-orm/mysql-core";

/** Core user table backing the built-in sign-in flow. */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const printJobStatusValues = [
  "Submitted",
  "Pending",
  "Approved",
  "Printing",
  "Completed",
  "Failed",
  "Cancelled",
] as const;

export const shops = mysqlTable(
  "shops",
  {
    id: int("id").autoincrement().primaryKey(),
    ownerId: int("ownerId").notNull(),
    slug: varchar("slug", { length: 96 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    logoKey: varchar("logoKey", { length: 512 }),
    logoUrl: varchar("logoUrl", { length: 768 }),
    currency: varchar("currency", { length: 3 }).default("BDT").notNull(),
    baseFeeCents: int("baseFeeCents").default(0).notNull(),
    staleJobTimeoutMinutes: int("staleJobTimeoutMinutes").default(15).notNull(),
    setupCompleted: boolean("setupCompleted").default(false).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("shops_slug_unique").on(table.slug),
    index("shops_owner_idx").on(table.ownerId),
  ],
);

export const shopStaff = mysqlTable(
  "shop_staff",
  {
    id: int("id").autoincrement().primaryKey(),
    shopId: int("shopId").notNull(),
    userId: int("userId"),
    name: varchar("name", { length: 160 }).notNull(),
    email: varchar("email", { length: 320 }).notNull(),
    accessRole: mysqlEnum("accessRole", ["Owner", "Staff"]).default("Staff").notNull(),
    invitedAt: timestamp("invitedAt").defaultNow().notNull(),
    acceptedAt: timestamp("acceptedAt"),
  },
  table => [
    index("shop_staff_shop_idx").on(table.shopId),
    uniqueIndex("shop_staff_shop_email_unique").on(table.shopId, table.email),
  ],
);

export const paperOptions = mysqlTable(
  "paper_options",
  {
    id: int("id").autoincrement().primaryKey(),
    shopId: int("shopId").notNull(),
    name: varchar("name", { length: 80 }).notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    sortOrder: int("sortOrder").default(0).notNull(),
  },
  table => [
    index("paper_options_shop_idx").on(table.shopId),
    uniqueIndex("paper_options_shop_name_unique").on(table.shopId, table.name),
  ],
);

export const printRates = mysqlTable(
  "print_rates",
  {
    id: int("id").autoincrement().primaryKey(),
    shopId: int("shopId").notNull(),
    paperOptionId: int("paperOptionId").notNull(),
    colorMode: mysqlEnum("colorMode", ["Color", "Grayscale"]).notNull(),
    sides: mysqlEnum("sides", ["Single-sided", "Double-sided"]).notNull(),
    perPageCents: int("perPageCents").notNull(),
    isActive: boolean("isActive").default(true).notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    index("print_rates_shop_idx").on(table.shopId),
    uniqueIndex("print_rates_unique_option").on(
      table.shopId,
      table.paperOptionId,
      table.colorMode,
      table.sides,
    ),
  ],
);

export const printAgents = mysqlTable(
  "print_agents",
  {
    id: int("id").autoincrement().primaryKey(),
    shopId: int("shopId").notNull(),
    deviceName: varchar("deviceName", { length: 160 }).notNull(),
    selectedPrinter: varchar("selectedPrinter", { length: 255 }).notNull(),
    agentSecretHash: varchar("agentSecretHash", { length: 128 }).notNull(),
    status: mysqlEnum("status", ["Online", "Offline", "Paused"]).default("Offline").notNull(),
    lastHeartbeatAt: timestamp("lastHeartbeatAt"),
    pairedAt: timestamp("pairedAt").defaultNow().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [index("print_agents_shop_idx").on(table.shopId)],
);

export const agentPairingCodes = mysqlTable(
  "agent_pairing_codes",
  {
    id: int("id").autoincrement().primaryKey(),
    shopId: int("shopId").notNull(),
    createdByUserId: int("createdByUserId").notNull(),
    codeHash: varchar("codeHash", { length: 128 }).notNull(),
    expiresAt: timestamp("expiresAt").notNull(),
    consumedAt: timestamp("consumedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [
    index("agent_pairing_codes_shop_idx").on(table.shopId),
    index("agent_pairing_codes_expiry_idx").on(table.expiresAt),
  ],
);

export const printJobs = mysqlTable(
  "print_jobs",
  {
    id: int("id").autoincrement().primaryKey(),
    shopId: int("shopId").notNull(),
    publicStatusToken: varchar("publicStatusToken", { length: 72 }).notNull(),
    customerReference: varchar("customerReference", { length: 160 }),
    fileName: varchar("fileName", { length: 255 }).notNull(),
    fileKey: varchar("fileKey", { length: 512 }).notNull(),
    fileUrl: varchar("fileUrl", { length: 768 }).notNull(),
    mimeType: varchar("mimeType", { length: 128 }).notNull(),
    pageCount: int("pageCount").default(1).notNull(),
    colorMode: mysqlEnum("colorMode", ["Color", "Grayscale"]).notNull(),
    copies: int("copies").notNull(),
    paperOptionId: int("paperOptionId").notNull(),
    paperName: varchar("paperName", { length: 80 }).notNull(),
    sides: mysqlEnum("sides", ["Single-sided", "Double-sided"]).notNull(),
    priceCents: int("priceCents").notNull(),
    status: mysqlEnum("status", printJobStatusValues).default("Submitted").notNull(),
    approvedAt: timestamp("approvedAt"),
    claimedByAgentId: int("claimedByAgentId"),
    claimedAt: timestamp("claimedAt"),
    lastAgentHeartbeatAt: timestamp("lastAgentHeartbeatAt"),
    startedPrintingAt: timestamp("startedPrintingAt"),
    completedAt: timestamp("completedAt"),
    cancelledAt: timestamp("cancelledAt"),
    failedAt: timestamp("failedAt"),
    failureReason: text("failureReason"),
    archivedAt: timestamp("archivedAt"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => [
    uniqueIndex("print_jobs_public_token_unique").on(table.publicStatusToken),
    index("print_jobs_shop_status_idx").on(table.shopId, table.status),
    index("print_jobs_agent_status_idx").on(table.claimedByAgentId, table.status),
    index("print_jobs_printing_heartbeat_idx").on(table.status, table.lastAgentHeartbeatAt),
    index("print_jobs_shop_archived_idx").on(table.shopId, table.archivedAt),
  ],
);

export const printJobEvents = mysqlTable(
  "print_job_events",
  {
    id: int("id").autoincrement().primaryKey(),
    jobId: int("jobId").notNull(),
    status: mysqlEnum("status", printJobStatusValues).notNull(),
    actorType: mysqlEnum("actorType", ["Customer", "Shop", "Agent", "System"]).notNull(),
    note: text("note"),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
  },
  table => [index("print_job_events_job_idx").on(table.jobId, table.createdAt)],
);

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Shop = typeof shops.$inferSelect;
export type PrintJob = typeof printJobs.$inferSelect;
