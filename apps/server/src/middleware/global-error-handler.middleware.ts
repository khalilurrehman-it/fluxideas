import type { Request, Response, NextFunction } from "express";
import { ApplicationBaseError } from "../shared/errors/ApplicationBaseError.js";
import { HTTP_STATUS_CODES } from "../shared/constants/http-status-code.constants.js";
import { formatErrorResponse } from "../shared/utils/api-response-formatter.util.js";
import { serverLogger } from "../config/logger.config.js";

export function globalErrorHandlerMiddleware(
  error: Error,
  _request: Request,
  response: Response,
  _next: NextFunction,
): void {
  if (error instanceof ApplicationBaseError) {
    if (!error.isOperational) {
      serverLogger.error("global-error-handler", "Non-operational error", error);
    }
    response
      .status(error.statusCode)
      .json(formatErrorResponse(error.message, error.statusCode));
    return;
  }

  serverLogger.error("global-error-handler", "Unhandled error", error);

  response
    .status(HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR)
    .json(
      formatErrorResponse(
        "An unexpected error occurred. Please try again.",
        HTTP_STATUS_CODES.INTERNAL_SERVER_ERROR,
      ),
    );
}
