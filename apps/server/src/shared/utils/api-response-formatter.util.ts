import type { ApiSuccessResponse, ApiErrorResponse } from "../types/pipeline.types.js";

export function formatSuccessResponse<TData>(
  data: TData,
  message?: string,
): ApiSuccessResponse<TData> {
  return { success: true, data, ...(message ? { message } : {}) };
}

export function formatErrorResponse(
  error: string,
  statusCode: number,
): ApiErrorResponse {
  return { success: false, error, statusCode };
}
