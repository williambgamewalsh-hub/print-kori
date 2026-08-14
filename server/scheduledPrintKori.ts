import type { Express, Request, Response } from "express";
import { failStalePrintingJobs } from "./printShopService";
import { sdk } from "./_core/sdk";

async function stalePrintJobHandler(req: Request, res: Response) {
  try {
    const user = await sdk.authenticateRequest(req);
    if (!user.isCron || !user.taskUid) return res.status(403).json({ error: "cron-only" });
    const result = await failStalePrintingJobs();
    return res.json({ ok: true, taskUid: user.taskUid, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return res.status(500).json({
      error: message,
      context: { url: req.originalUrl },
      timestamp: new Date().toISOString(),
    });
  }
}

export function registerPrintKoriScheduledHandlers(app: Express) {
  app.post("/api/scheduled/stale-print-jobs", stalePrintJobHandler);
}
