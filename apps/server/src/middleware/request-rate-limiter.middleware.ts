import type { Request, Response, NextFunction } from "express";
import { HTTP_STATUS_CODES } from "../shared/constants/http-status-code.constants.js";
import { formatErrorResponse } from "../shared/utils/api-response-formatter.util.js";

interface RateLimitWindowEntry {
  requestCount: number;
  windowStartTimestamp: number;
}

const rateLimitWindowStore = new Map<string, RateLimitWindowEntry>();

const RESEARCH_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW = 5;
const RESEARCH_RATE_LIMIT_WINDOW_DURATION_MS = 60 * 60 * 1000; // 1 hour

function getClientIdentifierFromRequest(request: Request): string {
  const forwarded = request.headers["x-forwarded-for"];
  const clientIp = Array.isArray(forwarded) ? forwarded[0] : forwarded?.split(",")[0];
  return (clientIp ?? request.socket.remoteAddress ?? "unknown").trim();
}

export function researchJobCreationRateLimiterMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const clientIdentifier = getClientIdentifierFromRequest(request);
  const currentTimestamp = Date.now();

  const existingEntry = rateLimitWindowStore.get(clientIdentifier);

  if (
    !existingEntry ||
    currentTimestamp - existingEntry.windowStartTimestamp > RESEARCH_RATE_LIMIT_WINDOW_DURATION_MS
  ) {
    rateLimitWindowStore.set(clientIdentifier, {
      requestCount: 1,
      windowStartTimestamp: currentTimestamp,
    });
    next();
    return;
  }

  if (existingEntry.requestCount >= RESEARCH_RATE_LIMIT_MAX_REQUESTS_PER_WINDOW) {
    const windowResetTimestamp =
      existingEntry.windowStartTimestamp + RESEARCH_RATE_LIMIT_WINDOW_DURATION_MS;
    const secondsUntilReset = Math.ceil((windowResetTimestamp - currentTimestamp) / 1000);

    response.setHeader("Retry-After", String(secondsUntilReset));
    response
      .status(HTTP_STATUS_CODES.TOO_MANY_REQUESTS)
      .json(
        formatErrorResponse(
          "Too many research requests. You can run 5 research jobs per hour.",
          HTTP_STATUS_CODES.TOO_MANY_REQUESTS,
        ),
      );
    return;
  }

  existingEntry.requestCount += 1;
  next();
}
