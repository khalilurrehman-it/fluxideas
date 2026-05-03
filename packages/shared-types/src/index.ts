export type AgentPipelineExecutionStage =
  | "scraping"
  | "clustering"
  | "validating"
  | "generating"
  | "done";

export type AgentActivityLogEventType = "log" | "complete" | "error" | "problems_ready";

export type MarketResearchJobPipelineStatus =
  | "pending"
  | "scraping"
  | "clustering"
  | "validating"
  | "generating"
  | "done"
  | "failed";

export interface AgentActivityLogEvent {
  type: AgentActivityLogEventType;
  stage: AgentPipelineExecutionStage;
  message: string;
  timestamp: string;
  data?: unknown;
}

export interface ValidatedMarketProblem {
  problemTitle: string;
  problemDescription: string;
  evidencePostCount: number;
  existingSolutionGaps: string[];
  estimatedMarketSizeInDollars: number;
  opportunityGapScore: number;
  suggestedMinimumViableProductIdeas: string[];
}

export interface MarketResearchReport {
  reportId: string;
  searchId: string;
  topicQuery: string;
  topValidatedProblems: ValidatedMarketProblem[];
  pdfDownloadUrl: string;
  generatedAtTimestamp: string;
}

export interface MarketResearchJobStatus {
  searchId: string;
  topicQuery: string;
  currentPipelineStatus: MarketResearchJobPipelineStatus;
  createdAtTimestamp: string;
}

export interface StartMarketResearchJobRequest {
  topicQuery: string;
}

export interface StartMarketResearchJobResponse {
  searchId: string;
  message: string;
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
