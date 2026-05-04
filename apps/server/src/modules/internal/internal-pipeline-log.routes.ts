import { Router, type Request, type Response } from "express";
import { serverEnvironment } from "../../config/environment-variables.config.js";
import { broadcastAgentLogEventToResearchClients } from "../../websocket/agent-pipeline-websocket-server.js";
import { HTTP_STATUS_CODES } from "../../shared/constants/http-status-code.constants.js";
import type { AgentActivityLogEvent } from "../../shared/types/pipeline.types.js";

export const internalPipelineLogRouter = Router();

// Python agents POST log events here — forwarded to frontend via WebSocket.
// Protected by X-Internal-Key header, same key shared with the agent service.
internalPipelineLogRouter.post("/pipeline-log", (request: Request, response: Response) => {
  const providedInternalKey = request.headers["x-internal-key"];

  if (providedInternalKey !== serverEnvironment.INTERNAL_API_KEY) {
    response.status(HTTP_STATUS_CODES.FORBIDDEN).json({ error: "Forbidden" });
    return;
  }

  const logEventPayload = request.body as {
    searchJobId: string;
    type: string;
    stage: string;
    message: string;
    timestamp: string;
    data?: unknown;
  };

  if (!logEventPayload.searchJobId) {
    response.status(HTTP_STATUS_CODES.BAD_REQUEST).json({ error: "Missing searchJobId" });
    return;
  }

  const agentLogEvent: AgentActivityLogEvent = {
    type: logEventPayload.type as AgentActivityLogEvent["type"],
    stage: logEventPayload.stage as AgentActivityLogEvent["stage"],
    message: logEventPayload.message,
    timestamp: logEventPayload.timestamp,
    data: logEventPayload.data,
  };

  broadcastAgentLogEventToResearchClients(logEventPayload.searchJobId, agentLogEvent);

  response.status(HTTP_STATUS_CODES.OK).json({ received: true });
});
