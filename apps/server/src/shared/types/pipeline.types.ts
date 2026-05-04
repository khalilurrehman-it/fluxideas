export type AgentPipelineExecutionStage =
  | "scraping"
  | "clustering"
  | "validating"
  | "generating"
  | "done";

export type AgentActivityLogEventType = "log" | "complete" | "error" | "problems_ready";

export interface AgentActivityLogEvent {
  type: AgentActivityLogEventType;
  stage: AgentPipelineExecutionStage;
  message: string;
  timestamp: string;
  data?: unknown;
}

export interface ApiSuccessResponse<TData> {
  success: true;
  data: TData;
  message?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: string;
  statusCode: number;
}
