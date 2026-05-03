import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "http";
import type { Server } from "http";
import type { AgentActivityLogEvent } from "@FluxIdeas/shared-types";
import { serverLogger } from "../config/logger.config.js";

const activeResearchWebSocketConnections = new Map<string, Set<WebSocket>>();

function extractSearchIdFromWebSocketRequestUrl(requestUrl: string): string | null {
  const match = requestUrl.match(/\/ws\/research\/([^/?#]+)/);
  return match ? (match[1] ?? null) : null;
}

export function createAgentPipelineWebSocketServer(httpServer: Server): WebSocketServer {
  const webSocketServer = new WebSocketServer({ server: httpServer });

  webSocketServer.on("connection", (clientSocket: WebSocket, request: IncomingMessage) => {
    const searchId = extractSearchIdFromWebSocketRequestUrl(request.url ?? "");

    if (!searchId) {
      clientSocket.close(1008, "Missing searchId in WebSocket URL");
      return;
    }

    if (!activeResearchWebSocketConnections.has(searchId)) {
      activeResearchWebSocketConnections.set(searchId, new Set());
    }
    activeResearchWebSocketConnections.get(searchId)!.add(clientSocket);

    serverLogger.info(
      "websocket",
      `Client connected for research job ${searchId}. Active connections: ${activeResearchWebSocketConnections.get(searchId)!.size}`,
    );

    const welcomeEvent: AgentActivityLogEvent = {
      type: "log",
      stage: "scraping",
      message: "Connected — pipeline starting shortly...",
      timestamp: new Date().toISOString(),
    };
    clientSocket.send(JSON.stringify(welcomeEvent));

    clientSocket.on("close", () => {
      const connectionSet = activeResearchWebSocketConnections.get(searchId);
      if (connectionSet) {
        connectionSet.delete(clientSocket);
        if (connectionSet.size === 0) {
          activeResearchWebSocketConnections.delete(searchId);
        }
      }
    });

    clientSocket.on("error", (error) => {
      serverLogger.error("websocket", `Client error for search ${searchId}`, error);
    });
  });

  return webSocketServer;
}

export function broadcastAgentLogEventToResearchClients(
  searchId: string,
  logEvent: AgentActivityLogEvent,
): void {
  const connectionSet = activeResearchWebSocketConnections.get(searchId);
  if (!connectionSet || connectionSet.size === 0) return;

  const serializedEvent = JSON.stringify(logEvent);

  for (const clientSocket of connectionSet) {
    if (clientSocket.readyState === WebSocket.OPEN) {
      clientSocket.send(serializedEvent);
    }
  }
}

export function getActiveWebSocketConnectionCount(): number {
  let total = 0;
  for (const connectionSet of activeResearchWebSocketConnections.values()) {
    total += connectionSet.size;
  }
  return total;
}
