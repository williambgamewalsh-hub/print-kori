import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  completeShopSetup,
  createAgentPairingCode,
  createCustomerPrintJob,
  getOwnerDashboard,
  getPublicJob,
  getPublicShop,
  getQuote,
  transitionOwnedJob,
} from "./printShopService";

const colorModeSchema = z.enum(["Color", "Grayscale"]);
const sidesSchema = z.enum(["Single-sided", "Double-sided"]);

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  printKori: router({
    publicShop: publicProcedure.input(z.object({ slug: z.string().min(3).max(96) })).query(({ input }) => getPublicShop(input.slug)),
    quote: publicProcedure
      .input(
        z.object({
          shopSlug: z.string().min(3).max(96),
          paperOptionId: z.number().int().positive(),
          colorMode: colorModeSchema,
          sides: sidesSchema,
          copies: z.number().int().min(1).max(100),
          pageCount: z.number().int().min(1).max(1000),
        }),
      )
      .query(({ input }) => getQuote(input)),
    submitCustomerJob: publicProcedure
      .input(
        z.object({
          shopSlug: z.string().min(3).max(96),
          customerReference: z.string().max(160).optional(),
          fileName: z.string().min(1).max(255),
          mimeType: z.string().min(1).max(128),
          fileDataBase64: z.string().min(4).max(14_000_000),
          paperOptionId: z.number().int().positive(),
          colorMode: colorModeSchema,
          sides: sidesSchema,
          copies: z.number().int().min(1).max(100),
          pageCount: z.number().int().min(1).max(1000),
        }),
      )
      .mutation(({ input }) =>
        createCustomerPrintJob({
          ...input,
          fileData: Buffer.from(input.fileDataBase64, "base64"),
        }),
      ),
    publicJob: publicProcedure
      .input(z.object({ publicStatusToken: z.string().min(12).max(72) }))
      .query(({ input }) => getPublicJob(input.publicStatusToken)),
    ownerDashboard: protectedProcedure.query(({ ctx }) => getOwnerDashboard(ctx.user.id)),
    completeSetup: protectedProcedure
      .input(
        z.object({
          shopName: z.string().min(3).max(160),
          logoUrl: z.string().max(768).nullable().optional(),
          currency: z.string().length(3).default("BDT"),
          baseFeeCents: z.number().int().min(0).max(100000),
          staleJobTimeoutMinutes: z.number().int().min(1).max(1440),
          paperOptions: z.array(z.string().min(1).max(80)).min(1).max(12),
          rates: z
            .array(
              z.object({
                paperName: z.string().min(1).max(80),
                colorMode: colorModeSchema,
                sides: sidesSchema,
                perPageCents: z.number().int().min(0).max(100000),
              }),
            )
            .min(1)
            .max(48),
          staff: z.array(z.object({ name: z.string().min(1).max(160), email: z.string().email().max(320) })).max(20),
        }),
      )
      .mutation(({ ctx, input }) => completeShopSetup({ ownerId: ctx.user.id, ...input })),
    transitionJob: protectedProcedure
      .input(z.object({ jobId: z.number().int().positive(), targetStatus: z.enum(["Approved", "Cancelled"]) }))
      .mutation(({ ctx, input }) => transitionOwnedJob({ ownerId: ctx.user.id, ...input })),
    createPairingCode: protectedProcedure.mutation(({ ctx }) => createAgentPairingCode(ctx.user.id)),
  }),
});

export type AppRouter = typeof appRouter;
