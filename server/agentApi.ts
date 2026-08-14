import type { Express, Request, Response } from "express";
import {
  authenticateAgent,
  claimApprovedJobForAgent,
  pairAgent,
  recordAgentHeartbeat,
  reportAgentJob,
} from "./printShopService";

function getAgentCredentials(req: Request) {
  const agentId = Number(req.header("x-printkori-agent-id"));
  const agentSecret = req.header("x-printkori-agent-secret");
  if (!Number.isInteger(agentId) || agentId < 1 || !agentSecret) {
    throw new Error("Missing print-agent credentials");
  }
  return { agentId, agentSecret };
}

async function verifiedAgent(req: Request) {
  const { agentId, agentSecret } = getAgentCredentials(req);
  return authenticateAgent(agentId, agentSecret);
}

function sendApiError(res: Response, error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected agent API error";
  const clientError = /Missing|Invalid|expired|unavailable|assigned|Only Printing|not found/i.test(message);
  return res.status(clientError ? 400 : 500).json({ error: message });
}

export function registerPrintAgentApi(app: Express) {
  app.post("/api/agent/pair", async (req, res) => {
    try {
      const code = typeof req.body?.code === "string" ? req.body.code : "";
      const deviceName = typeof req.body?.deviceName === "string" ? req.body.deviceName : "";
      const selectedPrinter = typeof req.body?.selectedPrinter === "string" ? req.body.selectedPrinter : "";
      if (!code || !deviceName || !selectedPrinter) {
        return res.status(400).json({ error: "code, deviceName, and selectedPrinter are required" });
      }
      const paired = await pairAgent({ code, deviceName, selectedPrinter });
      return res.status(201).json(paired);
    } catch (error) {
      return sendApiError(res, error);
    }
  });

  app.post("/api/agent/claim", async (req, res) => {
    try {
      const agent = await verifiedAgent(req);
      const job = await claimApprovedJobForAgent(agent);
      if (!job) return res.json({ job: null });
      return res.json({
        job: {
          id: job.id,
          fileName: job.fileName,
          fileUrl: job.fileUrl,
          mimeType: job.mimeType,
          colorMode: job.colorMode,
          copies: job.copies,
          paperName: job.paperName,
          sides: job.sides,
          status: job.status,
        },
      });
    } catch (error) {
      return sendApiError(res, error);
    }
  });

  app.post("/api/agent/ping", async (req, res) => {
    try {
      const agent = await verifiedAgent(req);
      return res.json(await recordAgentHeartbeat(agent));
    } catch (error) {
      return sendApiError(res, error);
    }
  });

  app.post("/api/agent/jobs/:jobId/heartbeat", async (req, res) => {
    try {
      const agent = await verifiedAgent(req);
      const jobId = Number(req.params.jobId);
      const result = await reportAgentJob({ agent, jobId, action: "heartbeat" });
      return res.json(result);
    } catch (error) {
      return sendApiError(res, error);
    }
  });

  app.post("/api/agent/jobs/:jobId/complete", async (req, res) => {
    try {
      const agent = await verifiedAgent(req);
      const jobId = Number(req.params.jobId);
      const result = await reportAgentJob({ agent, jobId, action: "complete" });
      return res.json(result);
    } catch (error) {
      return sendApiError(res, error);
    }
  });

  app.post("/api/agent/jobs/:jobId/fail", async (req, res) => {
    try {
      const agent = await verifiedAgent(req);
      const jobId = Number(req.params.jobId);
      const failureReason = typeof req.body?.failureReason === "string" ? req.body.failureReason : undefined;
      const result = await reportAgentJob({ agent, jobId, action: "fail", failureReason });
      return res.json(result);
    } catch (error) {
      return sendApiError(res, error);
    }
  });
}
