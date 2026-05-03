import type { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { betterAuthInstance } from "../config/better-auth.config.js";
import { HTTP_STATUS_CODES } from "../shared/constants/http-status-code.constants.js";
import { formatErrorResponse } from "../shared/utils/api-response-formatter.util.js";
import { API_ERROR_MESSAGES } from "../shared/constants/api-error-message.constants.js";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

declare global {
  namespace Express {
    interface Request {
      authenticatedUser?: AuthenticatedUser;
      authSessionToken?: string;
    }
  }
}

export async function requireAuthenticatedSessionMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const sessionData = await betterAuthInstance.api.getSession({
      headers: fromNodeHeaders(request.headers),
    });

    if (!sessionData) {
      response
        .status(HTTP_STATUS_CODES.UNAUTHORIZED)
        .json(formatErrorResponse(API_ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS_CODES.UNAUTHORIZED));
      return;
    }

    request.authenticatedUser = sessionData.user as AuthenticatedUser;
    request.authSessionToken = sessionData.session.token;
    next();
  } catch {
    response
      .status(HTTP_STATUS_CODES.UNAUTHORIZED)
      .json(formatErrorResponse(API_ERROR_MESSAGES.UNAUTHORIZED, HTTP_STATUS_CODES.UNAUTHORIZED));
  }
}
