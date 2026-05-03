import type { Request, Response, NextFunction } from "express";
import { startMarketResearchJobRequestBodySchema } from "./market-research.validation.js";
import {
  createMarketResearchJobAndStartPipeline,
} from "./market-research.service.js";
import {
  findSearchRecordById,
  findAllSearchRecordsByUserId,
  deleteSearchRecordById,
} from "./market-research.repository.js";
import { HTTP_STATUS_CODES } from "../../shared/constants/http-status-code.constants.js";
import { API_ERROR_MESSAGES } from "../../shared/constants/api-error-message.constants.js";
import { formatSuccessResponse } from "../../shared/utils/api-response-formatter.util.js";
import { ResourceNotFoundError } from "../../shared/errors/ResourceNotFoundError.js";
import { ValidationFailedError } from "../../shared/errors/ValidationFailedError.js";

export async function handleStartMarketResearchJobRequest(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const parseResult = startMarketResearchJobRequestBodySchema.safeParse(request.body);

    if (!parseResult.success) {
      throw new ValidationFailedError(
        parseResult.error.issues.map((i) => i.message).join(", "),
      );
    }

    const { topicQuery } = parseResult.data;
    const userId = request.authenticatedUser!.id;

    const newSearchRecord = await createMarketResearchJobAndStartPipeline(userId, topicQuery);

    response.status(HTTP_STATUS_CODES.ACCEPTED).json(
      formatSuccessResponse(
        { searchId: newSearchRecord.id, message: "Research pipeline started." },
        "Research pipeline started.",
      ),
    );
  } catch (error) {
    next(error);
  }
}

export async function handleGetAllUserResearchJobsRequest(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const userId = request.authenticatedUser!.id;
    const allSearchRecords = await findAllSearchRecordsByUserId(userId);

    response
      .status(HTTP_STATUS_CODES.OK)
      .json(formatSuccessResponse(allSearchRecords));
  } catch (error) {
    next(error);
  }
}

export async function handleGetSingleResearchJobStatusRequest(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const searchId = request.params.searchId as string;
    const userId = request.authenticatedUser!.id;

    const searchRecord = await findSearchRecordById(searchId);

    if (!searchRecord || searchRecord.userId !== userId) {
      throw new ResourceNotFoundError(API_ERROR_MESSAGES.SEARCH_NOT_FOUND);
    }

    response.status(HTTP_STATUS_CODES.OK).json(formatSuccessResponse(searchRecord));
  } catch (error) {
    next(error);
  }
}

export async function handleDeleteResearchJobRequest(
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const searchId = request.params.searchId as string;
    const userId = request.authenticatedUser!.id;

    const searchRecord = await findSearchRecordById(searchId);

    if (!searchRecord || searchRecord.userId !== userId) {
      throw new ResourceNotFoundError(API_ERROR_MESSAGES.SEARCH_NOT_FOUND);
    }

    await deleteSearchRecordById(searchId);

    response.status(HTTP_STATUS_CODES.NO_CONTENT).send();
  } catch (error) {
    next(error);
  }
}

