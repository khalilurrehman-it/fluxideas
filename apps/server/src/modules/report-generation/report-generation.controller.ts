import type { Request, Response, NextFunction } from "express";
import { getAllReportsForUser, getSingleReportById, deleteReportById } from "./report-generation.service.js";
import { HTTP_STATUS_CODES } from "../../shared/constants/http-status-code.constants.js";
import { API_ERROR_MESSAGES } from "../../shared/constants/api-error-message.constants.js";
import { formatSuccessResponse } from "../../shared/utils/api-response-formatter.util.js";
import { ResourceNotFoundError } from "../../shared/errors/ResourceNotFoundError.js";

export async function handleGetAllReportsRequest(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = request.authenticatedUser!.id;
    const reports = await getAllReportsForUser(userId);
    response.status(HTTP_STATUS_CODES.OK).json(formatSuccessResponse(reports));
  } catch (error) {
    next(error);
  }
}

export async function handleGetSingleReportRequest(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reportId = request.params.reportId as string;
    const userId = request.authenticatedUser!.id;

    const report = await getSingleReportById(reportId, userId);

    if (!report) {
      throw new ResourceNotFoundError(API_ERROR_MESSAGES.REPORT_NOT_FOUND);
    }

    response.status(HTTP_STATUS_CODES.OK).json(formatSuccessResponse(report));
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteReportRequest(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const reportId = request.params.reportId as string;
    const userId = request.authenticatedUser!.id;

    const wasDeleted = await deleteReportById(reportId, userId);

    if (!wasDeleted) {
      throw new ResourceNotFoundError(API_ERROR_MESSAGES.REPORT_NOT_FOUND);
    }

    response.status(HTTP_STATUS_CODES.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
}
