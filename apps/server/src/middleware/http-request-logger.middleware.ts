import type { Request, Response, NextFunction } from "express";

export function httpRequestLoggerMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const requestStartTime = Date.now();

  response.on("finish", () => {
    const durationMs = Date.now() - requestStartTime;
    const statusCode = response.statusCode;
    const logPrefix = statusCode >= 500 ? "ERROR" : statusCode >= 400 ? "WARN" : "INFO";
    console.log(
      `[${new Date().toISOString()}] [${logPrefix}] ${request.method} ${request.originalUrl} ${statusCode} ${durationMs}ms`,
    );
  });

  next();
}
