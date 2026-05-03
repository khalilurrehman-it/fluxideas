import "dotenv/config";
import { createServer } from "http";
import express, { type Express } from "express";
import cors from "cors";
import helmet from "helmet";

import { serverEnvironment } from "./config/environment-variables.config.js";
import { corsAllowedOrigins } from "./config/cors-allowed-origins.config.js";
import { serverLogger } from "./config/logger.config.js";

import { httpRequestLoggerMiddleware } from "./middleware/http-request-logger.middleware.js";
import { globalErrorHandlerMiddleware } from "./middleware/global-error-handler.middleware.js";

import { toNodeHandler } from "better-auth/node";
import { betterAuthInstance } from "./config/better-auth.config.js";
import { marketResearchRouter } from "./modules/market-research/market-research.routes.js";
import { reportGenerationRouter } from "./modules/report-generation/report-generation.routes.js";
import { internalPipelineLogRouter } from "./modules/internal/internal-pipeline-log.routes.js";
import { createAgentPipelineWebSocketServer } from "./websocket/agent-pipeline-websocket-server.js";
import { checkEmailExists } from "./modules/user-authentication/user-authentication.service.js";

function buildExpressApplication(): Express {
  const expressApplication = express();

  // Security headers
  expressApplication.use(helmet());

  // CORS — only the frontend origin is allowed
  expressApplication.use(cors({ origin: corsAllowedOrigins, credentials: true }));

  // Request logging
  expressApplication.use(httpRequestLoggerMiddleware);

  // Custom auth helper — must be before the Better Auth catch-all and needs no body parsing (uses query params).
  expressApplication.get("/api/auth/check-email", async (req, res) => {
    const email = typeof req.query.email === "string" ? req.query.email : "";
    if (!email) { res.status(400).json({ error: "email query param required" }); return; }
    const exists = await checkEmailExists(email);
    res.json({ exists });
  });

  // Better Auth must be mounted BEFORE express.json() — it handles its own body parsing.
  // app.all (not app.use) preserves the full req.url so Better Auth routes correctly.
  expressApplication.all("/api/auth/*splat", toNodeHandler(betterAuthInstance));

  // Body parsing for all other routes
  expressApplication.use(express.json({ limit: "1mb" }));

  // Internal endpoint — Python agents post log events here
  expressApplication.use("/internal", internalPipelineLogRouter);

  // Public API routes
  expressApplication.use("/api/research", marketResearchRouter);
  expressApplication.use("/api/reports", reportGenerationRouter);

  // Health check (no auth required)
  expressApplication.get("/health", (_req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Global error handler — must be last
  expressApplication.use(globalErrorHandlerMiddleware);

  return expressApplication;
}

const expressApplication = buildExpressApplication();
const httpServer = createServer(expressApplication);

createAgentPipelineWebSocketServer(httpServer);

const serverListeningPort = Number(serverEnvironment.PORT);

httpServer.listen(serverListeningPort, () => {
  serverLogger.info("server", `IdeaRadar server listening on port ${serverListeningPort}`);
  serverLogger.info("server", `Accepting requests from: ${serverEnvironment.FRONTEND_URL}`);
  serverLogger.info("server", `Environment: ${serverEnvironment.NODE_ENV}`);
});

export { expressApplication };
