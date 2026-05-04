import { serverEnvironment } from "../../config/environment-variables.config.js";
import { serverLogger } from "../../config/logger.config.js";
import type { SearchRecord } from "../../database/schema/searches.schema.js";
import {
  createNewSearchRecord as dbCreateSearch,
  updateSearchRecordPipelineStatus as dbUpdateStatus,
} from "./market-research.repository.js";
import { createNewReportRecord } from "../report-generation/report-generation.repository.js";
import { broadcastAgentLogEventToResearchClients } from "../../websocket/agent-pipeline-websocket-server.js";
import type { AgentActivityLogEvent } from "../../shared/types/pipeline.types.js";

// ---------------------------------------------------------------------------
// Phase 1 response shape
// ---------------------------------------------------------------------------
interface Phase1IdentifiedProblem {
  problem_name: string;
  market_gap?: string;
  urgency_score?: number;
  commercial_potential?: number;
  feasibility_score?: number;
  founder_fit_score?: number;
  market_score?: number;
  target_customer?: string;
  description?: string;
  sentiment?: string;
  source_refs?: Array<{ author?: string; url?: string; title?: string }>;
}

interface Phase1ApiResponse {
  session_token: string;
  identified_problems: Phase1IdentifiedProblem[];
}

// ---------------------------------------------------------------------------
// Phase 2 response shape
// ---------------------------------------------------------------------------
interface Phase2ApiResponse {
  pdf_url: string | null;
  pptx_url?: string | null;
  mockup_url?: string | null;
  blueprint?: Record<string, unknown>;
  market_size_analysis?: { tam?: string; sam?: string; som?: string };
  risk_assessment?: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Public: start a new research job (Phase 1 only)
// ---------------------------------------------------------------------------
export async function createMarketResearchJobAndStartPipeline(
  userId: string,
  topicQuery: string,
): Promise<SearchRecord> {
  const newSearchRecord = await dbCreateSearch({
    userId,
    topicQuery,
    pipelineStatus: "pending",
  });

  void runPhase1InBackground(newSearchRecord.id, userId, topicQuery);

  return newSearchRecord;
}

// ---------------------------------------------------------------------------
// Private: Phase 1 background execution
// ---------------------------------------------------------------------------
async function runPhase1InBackground(
  searchId: string,
  userId: string,
  topicQuery: string,
): Promise<void> {
  const logCallbackUrl = `${serverEnvironment.BETTER_AUTH_URL}/internal/pipeline-log`;

  try {
    await dbUpdateStatus(searchId, "scraping");

    const phase1Response = await fetch(
      `${serverEnvironment.AGENT_SERVICE_URL}/run-pipeline/phase1`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Key": serverEnvironment.INTERNAL_API_KEY,
        },
        body: JSON.stringify({
          research_topic: topicQuery,
          search_job_id: searchId,
          nodejs_log_callback_url: logCallbackUrl,
          founder_profile: null,
        }),
        signal: AbortSignal.timeout(10 * 60 * 1000), // 10-minute timeout for Phase 1
      },
    );

    if (!phase1Response.ok) {
      throw new Error(`Phase 1 returned HTTP ${phase1Response.status}`);
    }

    const phase1Result = (await phase1Response.json()) as Phase1ApiResponse;

    const topProblem = phase1Result.identified_problems[0];
    if (!topProblem) {
      throw new Error("Phase 1 returned no problems — nothing to analyse.");
    }

    await dbUpdateStatus(searchId, "clustering");

    // Send all identified problems to the frontend so the user can see them
    const problemsReadyEvent: AgentActivityLogEvent = {
      type: "problems_ready",
      stage: "clustering",
      message: `Found ${phase1Result.identified_problems.length} market gaps — auto-analyzing top opportunity: "${topProblem.problem_name}"`,
      timestamp: new Date().toISOString(),
      data: {
        identified_problems: phase1Result.identified_problems,
        selected_problem: topProblem,
      },
    };
    broadcastAgentLogEventToResearchClients(searchId, problemsReadyEvent);

    // Auto-select top problem and immediately run Phase 2
    void runPhase2InBackground(searchId, userId, searchId, topProblem);
  } catch (phase1Error) {
    serverLogger.error(
      "market-research-service",
      `Phase 1 error for search ${searchId}`,
      phase1Error,
    );
    await dbUpdateStatus(searchId, "failed").catch(() => {});

    const errorEvent: AgentActivityLogEvent = {
      type: "error",
      stage: "scraping",
      message: "Pipeline Phase 1 encountered an error. Please try again.",
      timestamp: new Date().toISOString(),
    };
    broadcastAgentLogEventToResearchClients(searchId, errorEvent);
  }
}

// ---------------------------------------------------------------------------
// Private: Phase 2 background execution
// ---------------------------------------------------------------------------
async function runPhase2InBackground(
  searchId: string,
  userId: string,
  sessionToken: string,
  selectedProblem: Phase1IdentifiedProblem,
): Promise<void> {
  const logCallbackUrl = `${serverEnvironment.BETTER_AUTH_URL}/internal/pipeline-log`;

  try {
    await dbUpdateStatus(searchId, "validating");

    const phase2Response = await fetch(
      `${serverEnvironment.AGENT_SERVICE_URL}/run-pipeline/phase2`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Internal-Key": serverEnvironment.INTERNAL_API_KEY,
        },
        body: JSON.stringify({
          session_token: sessionToken,
          search_job_id: searchId,
          selected_problem: selectedProblem,
          nodejs_log_callback_url: logCallbackUrl,
        }),
        signal: AbortSignal.timeout(10 * 60 * 1000), // 10-minute timeout for Phase 2
      },
    );

    if (!phase2Response.ok) {
      throw new Error(`Phase 2 returned HTTP ${phase2Response.status}`);
    }

    const phase2Result = (await phase2Response.json()) as Phase2ApiResponse;

    // Persist the report
    const reportRecord = await createNewReportRecord({
      searchId,
      userId,
      pdfDownloadUrl: phase2Result.pdf_url,
      topValidatedProblems: {
        selected_problem: selectedProblem,
        blueprint: phase2Result.blueprint ?? null,
        market_size_analysis: phase2Result.market_size_analysis ?? null,
        risk_assessment: phase2Result.risk_assessment ?? null,
        mockup_url: phase2Result.mockup_url ?? null,
      },
    });

    await dbUpdateStatus(searchId, "done");

    // Broadcast completion
    const completeEvent: AgentActivityLogEvent = {
      type: "complete",
      stage: "done",
      message: "Report ready — your deep dive is complete.",
      timestamp: new Date().toISOString(),
      data: {
        report_id: reportRecord.id,
        pdf_url: phase2Result.pdf_url,
        pptx_url: phase2Result.pptx_url ?? null,
        mockup_url: phase2Result.mockup_url ?? null,
        blueprint: phase2Result.blueprint ?? null,
        market_size_analysis: phase2Result.market_size_analysis ?? null,
        risk_assessment: phase2Result.risk_assessment ?? null,
        selected_problem: selectedProblem,
      },
    };
    broadcastAgentLogEventToResearchClients(searchId, completeEvent);
  } catch (phase2Error) {
    serverLogger.error(
      "market-research-service",
      `Phase 2 error for search ${searchId}`,
      phase2Error,
    );
    await dbUpdateStatus(searchId, "failed").catch(() => {});

    const errorEvent: AgentActivityLogEvent = {
      type: "error",
      stage: "generating",
      message: "Pipeline Phase 2 encountered an error. Please try again.",
      timestamp: new Date().toISOString(),
    };
    broadcastAgentLogEventToResearchClients(searchId, errorEvent);
  }
}
