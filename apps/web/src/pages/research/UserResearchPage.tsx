import { useState, useEffect, useRef, useCallback } from "react";
import { RESEARCH_SESSION_STORAGE_KEY } from "@/shared/constants/application-wide.constants";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  TbSearch,
  TbBrain,
  TbCheckbox,
  TbFileReport,
  TbCheck,
  TbChevronDown,
  TbChevronUp,
  TbArrowRight,
  TbRefresh,
  TbDownload,
  TbPresentation,
  TbExternalLink,
  TbAlertTriangle,
  TbShieldLock,
  TbCode,
  TbUsers,
  TbTrendingUp,
  TbTarget,
  TbBulb,
  TbSettings,
  TbBolt,
} from "react-icons/tb";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

const BACKEND_URL = import.meta.env.VITE_API_URL as string;

/* ── Validation schemas ───────────────────────────────────────── */

const researchFormSchema = z.object({
  topic: z
    .string()
    .min(3, "Topic must be at least 3 characters.")
    .max(500, "Topic is too long.")
    .trim(),
  skills: z.string().max(500).optional(),
  budget: z.string().optional(),
  time: z.string().optional(),
});

type ResearchFormValues = z.infer<typeof researchFormSchema>;

/* ── Types ────────────────────────────────────────────────────── */

type AgentStage =
  | "scraping"
  | "clustering"
  | "validating"
  | "generating"
  | "done"
  | "error";

interface AgentLogEvent {
  type: "log" | "complete" | "error" | "problems_ready";
  stage: AgentStage;
  message: string;
  timestamp: string;
  data?: {
    session_token?: string;
    identified_problems?: IdentifiedProblem[];
    selected_problem?: IdentifiedProblem;
    search_job_id?: string;
    report_id?: string;
    pdf_url?: string;
    pptx_url?: string;
    mockup_url?: string;
    blueprint?: FounderDossier;
    market_size_analysis?: MarketSizeAnalysis;
    risk_assessment?: RiskAssessment;
  };
}

interface IdentifiedProblem {
  problem_name: string;
  market_gap: string;
  urgency_score: number;
  commercial_potential: number;
  feasibility_score: number;
  founder_fit_score: number;
  market_score: number;
  target_customer: string;
  description: string;
  sentiment: string;
  source_refs: Array<{ author: string; url: string; title: string }>;
}

interface FounderDossier {
  core_utility?: string;
  the_hook?: string;
  admin_layer?: string;
  monetization_model?: string;
  monetization_price?: string;
  monetization_rationale?: string;
  competitors?: Array<{ name: string; weakness: string; your_edge: string }>;
  tech_stack?: string[];
  timeline?: string;
  sprint_plan?: string[];
  data_model?: string[];
  voice_of_customer?: Array<{ quote: string; author: string; url: string }>;
  mention_count?: number;
  source_summary?: string;
  overall_score?: number;
}

interface MarketSizeAnalysis {
  tam?: string;
  sam?: string;
  som?: string;
  tam_rationale?: string;
  sam_rationale?: string;
  som_rationale?: string;
}

interface RiskAssessment {
  technical_risk?: string;
  market_risk?: string;
  legal_risk?: string;
  kill_switch?: string;
  survival_strategy?: string;
}

interface FeedLine {
  id: number;
  stage: AgentStage;
  message: string;
  timestamp?: string;
}

interface DossierData {
  pdf_url?: string;
  pptx_url?: string;
  mockup_url?: string;
  blueprint?: FounderDossier;
  market_size_analysis?: MarketSizeAnalysis;
  risk_assessment?: RiskAssessment;
  selected_problem?: IdentifiedProblem;
}

type PageStage =
  | "input"
  | "phase1_feed"
  | "problem_select"
  | "phase2_feed"
  | "complete"
  | "error";

/* ── Constants ────────────────────────────────────────────────── */

const EXAMPLE_TOPICS = [
  "Remote work productivity tools",
  "Freelancer invoicing & taxes",
  "AI tools for content creators",
  "No-code for e-commerce sellers",
  "Developer tools for indie hackers",
];

const BUDGET_OPTIONS = [
  "Bootstrapped ($0–$100/mo)",
  "Early ($100–$1K/mo)",
  "Funded ($1K+/mo)",
];

const TIME_OPTIONS = [
  "Side project (5-10 hrs/wk)",
  "Part-time (10-20 hrs/wk)",
  "Full-time (40+ hrs/wk)",
];

interface PipelineStageConfig {
  key: AgentStage;
  label: string;
  icon: typeof TbSearch;
  badgeClass: string;
}

const PIPELINE_STAGES: PipelineStageConfig[] = [
  {
    key: "scraping",
    label: "Scrape",
    icon: TbSearch,
    badgeClass: "text-blue-400 bg-blue-400/10 border-blue-400/30",
  },
  {
    key: "clustering",
    label: "Cluster",
    icon: TbBrain,
    badgeClass: "text-purple-400 bg-purple-400/10 border-purple-400/30",
  },
  {
    key: "validating",
    label: "Validate",
    icon: TbCheckbox,
    badgeClass: "text-green-400 bg-green-400/10 border-green-400/30",
  },
  {
    key: "generating",
    label: "Report",
    icon: TbFileReport,
    badgeClass: "text-amber-400 bg-amber-400/10 border-amber-400/30",
  },
];

const DOSSIER_TABS = [
  { id: "opportunity", label: "The Opportunity" },
  { id: "mvp", label: "The MVP" },
  { id: "build", label: "The Build" },
  { id: "risks", label: "Risk Audit" },
] as const;

type DossierTabId = (typeof DOSSIER_TABS)[number]["id"];

/* ── Helper: score badge color ────────────────────────────────── */

function getScoreBadgeClass(score: number) {
  if (score >= 7) return "text-green-700 bg-green-50 border-green-200";
  if (score >= 5) return "text-amber-700 bg-amber-50 border-amber-200";
  return "text-red-700 bg-red-50 border-red-200";
}

function formatTimestamp(isoString?: string) {
  if (!isoString) return new Date().toTimeString().slice(0, 8);
  try {
    return new Date(isoString).toTimeString().slice(0, 8);
  } catch {
    return new Date().toTimeString().slice(0, 8);
  }
}

/* ── Stage progress bar ───────────────────────────────────────── */

function StageProgressBar({ currentStage }: { currentStage: AgentStage }) {
  const currentIndex = PIPELINE_STAGES.findIndex((s) => s.key === currentStage);
  const isDone = currentStage === "done";

  return (
    <div className="flex items-center gap-0 w-full">
      {PIPELINE_STAGES.map((stage, index) => {
        const StageIcon = stage.icon;
        const isCompleted = isDone || index < currentIndex;
        const isActive = !isDone && index === currentIndex;

        return (
          <div key={stage.key} className="flex items-center flex-1">
            <div className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`flex items-center justify-center w-8 h-8 rounded-full border-2 transition-all duration-300 ${
                  isCompleted
                    ? "bg-green-500 border-green-500 text-white"
                    : isActive
                      ? "bg-primary border-primary text-white"
                      : "bg-zinc-800 border-zinc-700 text-zinc-500"
                }`}
              >
                {isCompleted ? (
                  <TbCheck className="w-4 h-4" />
                ) : (
                  <StageIcon className="w-4 h-4" />
                )}
              </div>
              <span
                className={`text-[10px] font-semibold uppercase tracking-wide ${
                  isCompleted
                    ? "text-green-400"
                    : isActive
                      ? "text-white"
                      : "text-zinc-600"
                }`}
              >
                {stage.label}
              </span>
            </div>
            {index < PIPELINE_STAGES.length - 1 && (
              <div
                className={`h-0.5 flex-1 mb-5 transition-all duration-500 ${
                  isDone || index < currentIndex ? "bg-green-500" : "bg-zinc-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Live feed terminal ───────────────────────────────────────── */

function LiveFeedTerminal({
  title,
  subtitle,
  feedLines,
  currentStage,
  isRunning,
}: {
  title: string;
  subtitle?: string;
  feedLines: FeedLine[];
  currentStage: AgentStage;
  isRunning: boolean;
}) {
  const feedEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [feedLines]);

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden">
      {/* Terminal title bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/60">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2 w-2">
            {isRunning && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400/60" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full ${
                isRunning ? "bg-green-400" : "bg-green-500"
              }`}
            />
          </span>
          <span className="text-xs text-zinc-400 font-mono">{title}</span>
        </div>
        {subtitle && (
          <span className="text-xs text-zinc-600 italic font-mono truncate max-w-[200px]">
            {subtitle}
          </span>
        )}
      </div>

      {/* Stage progress */}
      <div className="px-6 pt-5 pb-4 border-b border-zinc-800/60">
        <StageProgressBar currentStage={currentStage} />
      </div>

      {/* Feed lines */}
      <div className="p-4 h-72 overflow-y-auto space-y-1.5 font-mono text-sm">
        {feedLines.map((line) => {
          const stageConfig = PIPELINE_STAGES.find((s) => s.key === line.stage);
          return (
            <div
              key={line.id}
              className="flex items-start gap-3"
            >
              <span className="text-zinc-600 shrink-0 select-none text-xs mt-0.5">
                [{formatTimestamp(line.timestamp)}]
              </span>
              {stageConfig && (
                <Badge
                  variant="outline"
                  className={`text-[10px] px-1.5 py-0 shrink-0 font-mono ${stageConfig.badgeClass}`}
                >
                  {line.stage.toUpperCase()}
                </Badge>
              )}
              <span className="text-zinc-200 leading-relaxed">{line.message}</span>
            </div>
          );
        })}
        {isRunning && (
          <div className="flex items-center gap-3">
            <span className="text-zinc-600 select-none text-xs">[{formatTimestamp()}]</span>
            <span className="inline-block w-2 h-4 bg-green-400/80 animate-pulse" />
          </div>
        )}
        <div ref={feedEndRef} />
      </div>
    </div>
  );
}

/* ── Problem card ─────────────────────────────────────────────── */

function ProblemCard({
  problem,
  onSelect,
  isLoading,
}: {
  problem: IdentifiedProblem;
  onSelect: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="group flex flex-col rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden">
      <div className="flex-1 p-5 space-y-3">
        {/* Name */}
        <h3 className="font-bold text-foreground text-base leading-snug">
          {problem.problem_name}
        </h3>

        {/* Description */}
        <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
          {problem.description}
        </p>

        {/* Target customer */}
        <Badge
          variant="outline"
          className="text-xs text-violet-700 bg-violet-50 border-violet-200"
        >
          <TbUsers className="w-3 h-3 mr-1" />
          {problem.target_customer}
        </Badge>

        {/* Score row */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold ${getScoreBadgeClass(problem.market_score)}`}
          >
            Market {problem.market_score}/10
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold ${getScoreBadgeClass(problem.urgency_score)}`}
          >
            Urgency {problem.urgency_score}/10
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold ${getScoreBadgeClass(problem.founder_fit_score)}`}
          >
            Fit {problem.founder_fit_score}/10
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold ${getScoreBadgeClass(problem.feasibility_score)}`}
          >
            Feasibility {problem.feasibility_score}/10
          </Badge>
        </div>

        {/* Source links */}
        {problem.source_refs && problem.source_refs.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {problem.source_refs.slice(0, 3).map((ref, i) => (
              <a
                key={i}
                href={ref.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-[10px] text-muted-foreground/60 hover:text-primary transition-colors"
              >
                <TbExternalLink className="w-2.5 h-2.5" />
                {ref.author || ref.title?.slice(0, 20) || "Source"}
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Select button */}
      <div className="px-5 pb-5">
        <Button
          onClick={onSelect}
          disabled={isLoading}
          className="w-full rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold gap-2 text-sm"
        >
          {isLoading ? (
            "Launching deep dive..."
          ) : (
            <>
              Select & Build
              <TbArrowRight className="w-4 h-4" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

/* ── Dossier tabs ─────────────────────────────────────────────── */

function MetricCard({
  label,
  value,
  sub,
  colorClass = "text-foreground",
}: {
  label: string;
  value: string;
  sub?: string;
  colorClass?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
        {label}
      </p>
      <p className={`text-2xl font-extrabold tabular-nums ${colorClass}`}>{value}</p>
      {sub && <p className="text-xs text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
  );
}

function OpportunityTab({
  problem,
  blueprint,
  marketSize,
}: {
  problem: IdentifiedProblem;
  blueprint?: FounderDossier;
  marketSize?: MarketSizeAnalysis;
}) {
  return (
    <div className="space-y-6">
      {/* Signal metrics */}
      {(blueprint?.mention_count !== undefined || blueprint?.source_summary) && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <TbTrendingUp className="w-4 h-4 text-primary" />
              Signal Strength
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {blueprint?.mention_count !== undefined && (
                <MetricCard
                  label="Mentions Found"
                  value={String(blueprint.mention_count)}
                  colorClass="text-primary"
                />
              )}
              {blueprint?.source_summary && (
                <div className="rounded-xl border border-border bg-card p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                    Source Summary
                  </p>
                  <p className="text-sm text-foreground">{blueprint.source_summary}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Opportunity scores */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <TbTarget className="w-4 h-4 text-primary" />
            Market Gap Scores
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard
              label="Overall"
              value={`${problem.market_score}/10`}
              colorClass={
                problem.market_score >= 7
                  ? "text-green-600"
                  : problem.market_score >= 5
                    ? "text-amber-600"
                    : "text-red-600"
              }
            />
            <MetricCard
              label="Urgency"
              value={`${problem.urgency_score}/10`}
              colorClass={
                problem.urgency_score >= 7
                  ? "text-green-600"
                  : problem.urgency_score >= 5
                    ? "text-amber-600"
                    : "text-red-600"
              }
            />
            <MetricCard
              label="Commercial"
              value={`${problem.commercial_potential}/10`}
              colorClass={
                problem.commercial_potential >= 7
                  ? "text-green-600"
                  : problem.commercial_potential >= 5
                    ? "text-amber-600"
                    : "text-red-600"
              }
            />
            <MetricCard
              label="Feasibility"
              value={`${problem.feasibility_score}/10`}
              colorClass={
                problem.feasibility_score >= 7
                  ? "text-green-600"
                  : problem.feasibility_score >= 5
                    ? "text-amber-600"
                    : "text-red-600"
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Market size */}
      {marketSize && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <TbTrendingUp className="w-4 h-4 text-primary" />
              Market Size
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {marketSize.tam && (
                <MetricCard
                  label="TAM"
                  value={marketSize.tam}
                  sub={marketSize.tam_rationale}
                  colorClass="text-blue-600"
                />
              )}
              {marketSize.sam && (
                <MetricCard
                  label="SAM"
                  value={marketSize.sam}
                  sub={marketSize.sam_rationale}
                  colorClass="text-violet-600"
                />
              )}
              {marketSize.som && (
                <MetricCard
                  label="SOM"
                  value={marketSize.som}
                  sub={marketSize.som_rationale}
                  colorClass="text-green-600"
                />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Voice of customer */}
      {blueprint?.voice_of_customer && blueprint.voice_of_customer.length > 0 && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <TbUsers className="w-4 h-4 text-primary" />
              Voice of Customer
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="space-y-3">
              {blueprint.voice_of_customer.slice(0, 3).map((voc, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-border bg-zinc-50 p-4"
                >
                  <p className="text-sm text-foreground italic leading-relaxed">
                    "{voc.quote}"
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="text-xs text-muted-foreground/60">—</span>
                    {voc.url ? (
                      <a
                        href={voc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        {voc.author || "Anonymous"}
                        <TbExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground/60">
                        {voc.author || "Anonymous"}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function MvpTab({
  blueprint,
  mockupUrl,
}: {
  blueprint?: FounderDossier;
  mockupUrl?: string;
}) {
  return (
    <div className="space-y-6">
      {/* Mockup image */}
      {mockupUrl && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <TbBulb className="w-4 h-4 text-primary" />
              AI-Generated Mockup
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <img
              src={mockupUrl}
              alt="AI-generated UI mockup"
              className="w-full rounded-xl border border-border object-contain max-h-96"
            />
          </CardContent>
        </Card>
      )}

      {/* MVP Blueprint */}
      {(blueprint?.core_utility || blueprint?.the_hook || blueprint?.admin_layer) && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <TbBolt className="w-4 h-4 text-primary" />
              MVP Blueprint
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {blueprint?.core_utility && (
                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <p className="text-xs font-bold text-blue-700 uppercase tracking-widest mb-2">
                    Core Utility
                  </p>
                  <p className="text-sm text-blue-900">{blueprint.core_utility}</p>
                </div>
              )}
              {blueprint?.the_hook && (
                <div className="rounded-xl border border-violet-200 bg-violet-50 p-4">
                  <p className="text-xs font-bold text-violet-700 uppercase tracking-widest mb-2">
                    The Hook
                  </p>
                  <p className="text-sm text-violet-900">{blueprint.the_hook}</p>
                </div>
              )}
              {blueprint?.admin_layer && (
                <div className="rounded-xl border border-green-200 bg-green-50 p-4">
                  <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-2">
                    Admin Layer
                  </p>
                  <p className="text-sm text-green-900">{blueprint.admin_layer}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Monetization */}
      {(blueprint?.monetization_model ||
        blueprint?.monetization_price ||
        blueprint?.monetization_rationale) && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <TbTrendingUp className="w-4 h-4 text-primary" />
              Monetization
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {blueprint?.monetization_model && (
                <MetricCard label="Model" value={blueprint.monetization_model} />
              )}
              {blueprint?.monetization_price && (
                <MetricCard
                  label="Price Point"
                  value={blueprint.monetization_price}
                  colorClass="text-green-600"
                />
              )}
              {blueprint?.monetization_rationale && (
                <div className="rounded-xl border border-border bg-card p-4 sm:col-span-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                    Rationale
                  </p>
                  <p className="text-sm text-foreground">{blueprint.monetization_rationale}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function BuildTab({ blueprint }: { blueprint?: FounderDossier }) {
  return (
    <div className="space-y-6">
      {/* Competitive landscape */}
      {blueprint?.competitors && blueprint.competitors.length > 0 && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <TbSearch className="w-4 h-4 text-primary" />
              Competitive Landscape
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <div className="rounded-xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-zinc-50 border-b border-border">
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Competitor
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Their Weakness
                    </th>
                    <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Your Edge
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {blueprint.competitors.map((comp, i) => (
                    <tr
                      key={i}
                      className={i < blueprint.competitors!.length - 1 ? "border-b border-border/40" : ""}
                    >
                      <td className="px-4 py-3 font-medium text-foreground">{comp.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{comp.weakness}</td>
                      <td className="px-4 py-3 text-green-700 font-medium">{comp.your_edge}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Technical roadmap */}
      <Card>
        <CardHeader className="pb-0">
          <CardTitle className="text-sm flex items-center gap-2">
            <TbCode className="w-4 h-4 text-primary" />
            Technical Roadmap
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-3 space-y-4">
          {blueprint?.tech_stack && blueprint.tech_stack.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                Tech Stack
              </p>
              <div className="flex flex-wrap gap-2">
                {blueprint.tech_stack.map((tech, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {tech}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {blueprint?.timeline && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
                Timeline
              </p>
              <p className="text-sm text-foreground">{blueprint.timeline}</p>
            </div>
          )}

          {blueprint?.sprint_plan && blueprint.sprint_plan.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
                4-Week Sprint Plan
              </p>
              <div className="space-y-1.5">
                {blueprint.sprint_plan.map((sprint, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-foreground">{sprint}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Data model */}
      {blueprint?.data_model && blueprint.data_model.length > 0 && (
        <Card>
          <CardHeader className="pb-0">
            <CardTitle className="text-sm flex items-center gap-2">
              <TbSettings className="w-4 h-4 text-primary" />
              Data Model
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-3">
            <ul className="space-y-1.5">
              {blueprint.data_model.map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-primary text-xs mt-1">•</span>
                  <span className="text-sm font-mono text-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function RisksTab({ riskAssessment }: { riskAssessment?: RiskAssessment }) {
  const risks = [
    {
      label: "Technical Risk",
      value: riskAssessment?.technical_risk,
      icon: TbCode,
      color: "red",
    },
    {
      label: "Market Risk",
      value: riskAssessment?.market_risk,
      icon: TbTrendingUp,
      color: "amber",
    },
    {
      label: "Legal Risk",
      value: riskAssessment?.legal_risk,
      icon: TbShieldLock,
      color: "red",
    },
    {
      label: "Kill-Switch Criteria",
      value: riskAssessment?.kill_switch,
      icon: TbAlertTriangle,
      color: "amber",
    },
  ] as const;

  const colorMap = {
    red: "border-red-200 bg-red-50 text-red-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
  };

  const iconColorMap = {
    red: "text-red-600",
    amber: "text-amber-600",
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {risks.map((risk) => {
          const RiskIcon = risk.icon;
          return (
            <div
              key={risk.label}
              className={`rounded-xl border p-4 ${colorMap[risk.color]}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <RiskIcon className={`w-4 h-4 ${iconColorMap[risk.color]}`} />
                <p className="text-xs font-bold uppercase tracking-widest">
                  {risk.label}
                </p>
              </div>
              <p className="text-sm leading-relaxed">
                {risk.value || "No specific risk identified."}
              </p>
            </div>
          );
        })}
      </div>

      {riskAssessment?.survival_strategy && (
        <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
          <div className="flex items-center gap-2 mb-2">
            <TbBulb className="w-4 h-4 text-blue-600" />
            <p className="text-xs font-bold uppercase tracking-widest text-blue-700">
              Survival Strategy
            </p>
          </div>
          <p className="text-sm text-blue-900 leading-relaxed">
            {riskAssessment.survival_strategy}
          </p>
        </div>
      )}
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function UserResearchPage() {
  const [pageStage, setPageStage] = useState<PageStage>("input");
  const [topic, setTopic] = useState("");
  const [searchId, setSearchId] = useState<string | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [feedLines, setFeedLines] = useState<FeedLine[]>([]);
  const [currentAgentStage, setCurrentAgentStage] = useState<AgentStage>("scraping");
  const [problems, setProblems] = useState<IdentifiedProblem[]>([]);
  const [selectingProblemIndex, setSelectingProblemIndex] = useState<number | null>(null);
  const [dossier, setDossier] = useState<DossierData | null>(null);
  const [activeTab, setActiveTab] = useState<DossierTabId>("opportunity");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [founderProfileOpen, setFounderProfileOpen] = useState(false);

  const wsRef = useRef<WebSocket | null>(null);
  const feedLineIdRef = useRef(0);
  const [pendingReconnectId, setPendingReconnectId] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ResearchFormValues>({
    resolver: zodResolver(researchFormSchema),
  });

  // Cleanup WebSocket on unmount
  useEffect(() => {
    return () => {
      wsRef.current?.close();
    };
  }, []);

  const appendFeedLine = useCallback((line: Omit<FeedLine, "id">) => {
    setFeedLines((prev) => [
      ...prev,
      { ...line, id: feedLineIdRef.current++ },
    ]);
  }, []);

  const handleAgentLogEvent = useCallback(
    (event: AgentLogEvent) => {
      if (event.stage && event.stage !== "error") {
        setCurrentAgentStage(event.stage);
      }

      if (event.type === "log") {
        appendFeedLine({
          stage: event.stage,
          message: event.message,
          timestamp: event.timestamp,
        });
      } else if (event.type === "problems_ready" && event.data) {
        appendFeedLine({
          stage: event.stage,
          message: event.message,
          timestamp: event.timestamp,
        });
        if (event.data.identified_problems) {
          setProblems(event.data.identified_problems);
        }
        if (event.data.selected_problem) {
          setDossier((prev) => ({ ...prev, selected_problem: event.data!.selected_problem }));
        }
        // Switch to phase2 feed — keep WebSocket open, Phase 2 complete event is still coming
        setPageStage("phase2_feed");
      } else if (event.type === "complete" && event.data) {
        appendFeedLine({
          stage: event.stage,
          message: event.message,
          timestamp: event.timestamp,
        });
        setDossier((prev) => ({
          ...prev,
          selected_problem: event.data!.selected_problem ?? prev?.selected_problem,
          pdf_url: event.data!.pdf_url,
          pptx_url: event.data!.pptx_url,
          mockup_url: event.data!.mockup_url,
          blueprint: event.data!.blueprint,
          market_size_analysis: event.data!.market_size_analysis,
          risk_assessment: event.data!.risk_assessment,
        }));
        setCurrentAgentStage("done");
        setPageStage("complete");
        wsRef.current?.close();
      } else if (event.type === "error") {
        appendFeedLine({
          stage: "error",
          message: event.message,
          timestamp: event.timestamp,
        });
        setErrorMessage(event.message || "An error occurred during analysis.");
        setPageStage("error");
        wsRef.current?.close();
      }
    },
    [appendFeedLine]
  );

  const connectWebSocket = useCallback(
    (sid: string) => {
      wsRef.current?.close();
      const wsUrl = BACKEND_URL.replace(/^https?/, (m) => (m === "https" ? "wss" : "ws")) +
        `/ws/research/${sid}`;
      const ws = new WebSocket(wsUrl);

      ws.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data as string) as AgentLogEvent;
          handleAgentLogEvent(data);
        } catch {
          // ignore malformed frames
        }
      };

      ws.onerror = () => {
        toast.error("Connection lost. The agent feed disconnected unexpectedly.");
        setErrorMessage("WebSocket connection failed. Please try again.");
        setPageStage("error");
      };

      wsRef.current = ws;
    },
    [handleAgentLogEvent]
  );

  // Restore research session on mount (so navigation away doesn't kill the job)
  useEffect(() => {
    const stored = sessionStorage.getItem(RESEARCH_SESSION_STORAGE_KEY);
    if (!stored) return;
    try {
      const s = JSON.parse(stored) as Partial<{
        pageStage: PageStage;
        topic: string;
        searchId: string;
        feedLines: FeedLine[];
        currentAgentStage: AgentStage;
        problems: IdentifiedProblem[];
        dossier: DossierData;
        sessionToken: string;
        errorMessage: string;
      }>;
      if (!s.pageStage || s.pageStage === "input") return;
      if (s.feedLines) { setFeedLines(s.feedLines); feedLineIdRef.current = s.feedLines.length; }
      if (s.topic) { setTopic(s.topic); setValue("topic", s.topic); }
      if (s.searchId) setSearchId(s.searchId);
      if (s.currentAgentStage) setCurrentAgentStage(s.currentAgentStage);
      if (s.problems) setProblems(s.problems);
      if (s.dossier) setDossier(s.dossier);
      if (s.sessionToken) setSessionToken(s.sessionToken);
      if (s.errorMessage) setErrorMessage(s.errorMessage);
      setPageStage(s.pageStage);
      if (s.searchId && (s.pageStage === "phase1_feed" || s.pageStage === "phase2_feed")) {
        setPendingReconnectId(s.searchId);
      }
    } catch {
      sessionStorage.removeItem(RESEARCH_SESSION_STORAGE_KEY);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Reconnect WebSocket after restoring session state (split into separate effect so connectWebSocket is in scope)
  useEffect(() => {
    if (!pendingReconnectId) return;
    connectWebSocket(pendingReconnectId);
    setPendingReconnectId(null);
  }, [pendingReconnectId, connectWebSocket]);

  // Persist session state on every meaningful change
  useEffect(() => {
    if (pageStage === "input") return;
    try {
      sessionStorage.setItem(RESEARCH_SESSION_STORAGE_KEY, JSON.stringify({
        pageStage,
        topic,
        searchId,
        feedLines: feedLines.slice(-60),
        currentAgentStage,
        problems,
        dossier,
        sessionToken,
        errorMessage,
      }));
    } catch { /* storage full — ignore */ }
  }, [pageStage, topic, searchId, feedLines, currentAgentStage, problems, dossier, sessionToken, errorMessage]);

  const onSubmitResearch = async (data: ResearchFormValues) => {
    setTopic(data.topic);
    setFeedLines([]);
    setCurrentAgentStage("scraping");
    setPageStage("phase1_feed");
    feedLineIdRef.current = 0;

    try {
      const body: Record<string, unknown> = { topicQuery: data.topic };
      if (data.skills || data.budget || data.time) {
        body.founderProfile = {
          skills: data.skills,
          budget: data.budget,
          time: data.time,
        };
      }

      const res = await fetch(`${BACKEND_URL}/api/research`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({})) as { message?: string };
        throw new Error(errData.message || "Failed to start research.");
      }

      const resData = await res.json() as { data?: { searchId?: string } };
      const sid = resData.data?.searchId ?? "";

      if (!sid) throw new Error("Server did not return a search ID.");

      setSearchId(sid);
      connectWebSocket(sid);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to start research.";
      toast.error(msg);
      setErrorMessage(msg);
      setPageStage("error");
    }
  };

  const onSelectProblem = (_problem: IdentifiedProblem, _index: number) => {
    toast.info("Custom problem selection is coming in a future update. The AI automatically analyses the top opportunity for you.");
  };

  const resetPage = () => {
    sessionStorage.removeItem(RESEARCH_SESSION_STORAGE_KEY);
    wsRef.current?.close();
    setPageStage("input");
    setTopic("");
    setSearchId(null);
    setSessionToken(null);
    setFeedLines([]);
    setCurrentAgentStage("scraping");
    setProblems([]);
    setSelectingProblemIndex(null);
    setDossier(null);
    setActiveTab("opportunity");
    setErrorMessage(null);
    feedLineIdRef.current = 0;
    setValue("topic", "");
  };

  /* ─────────────────────────────────────────────────────────────── */

  return (
    <div className="max-w-4xl mx-auto space-y-8">

      {/* Page header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">New Research</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Enter a market — our agents will find real validated problems for you.
          </p>
        </div>
        {pageStage !== "input" && (
          <Button
            variant="outline"
            size="sm"
            onClick={resetPage}
            disabled={pageStage === "phase1_feed" || pageStage === "phase2_feed"}
            className="shrink-0 gap-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <TbRefresh className="w-3.5 h-3.5" />
            New Scan
          </Button>
        )}
      </div>

      {/* ── Stage 1: Input ────────────────────────────────────────── */}
      {pageStage === "input" && (
        <div className="space-y-6">
          <div
            className="rounded-2xl border border-primary/20 p-6 sm:p-8"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.75 0.12 270 / 0.10), transparent 70%), oklch(0.99 0 0)",
            }}
          >
            <p className="text-xs font-bold text-brand-light uppercase tracking-widest mb-1">
              Intelligence Scan
            </p>
            <h2 className="text-xl font-bold text-foreground mb-5">
              What market or industry should we analyze?
            </h2>

            <form onSubmit={handleSubmit(onSubmitResearch)} noValidate className="space-y-5">
              {/* Topic input */}
              <div className="space-y-1.5">
                <Input
                  placeholder="e.g. remote work tools, no-code for creators, AI coding assistants"
                  autoComplete="off"
                  className="h-12 text-base border-border bg-white focus-visible:ring-primary/30"
                  aria-invalid={!!errors.topic}
                  {...register("topic")}
                />
                {errors.topic && (
                  <p className="text-xs text-red-500 font-medium">{errors.topic.message}</p>
                )}
              </div>

              {/* Founder profile accordion */}
              <div className="rounded-xl border border-border bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setFounderProfileOpen((o) => !o)}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-zinc-50 transition-colors"
                >
                  <span>Founder Profile (optional — improves fit scores)</span>
                  {founderProfileOpen ? (
                    <TbChevronUp className="w-4 h-4 shrink-0" />
                  ) : (
                    <TbChevronDown className="w-4 h-4 shrink-0" />
                  )}
                </button>

                {founderProfileOpen && (
                  <div className="px-4 pb-4 space-y-3 border-t border-border/40">
                    <div className="pt-3">
                      <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                        Your Skills
                      </label>
                      <Input
                        placeholder="e.g. Python, React, Marketing"
                        className="h-10 text-sm bg-zinc-50 border-border"
                        {...register("skills")}
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                          Budget
                        </label>
                        <select
                          className="w-full h-10 rounded-md border border-border bg-zinc-50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          {...register("budget")}
                        >
                          <option value="">Select budget...</option>
                          {BUDGET_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1.5 block">
                          Time Available
                        </label>
                        <select
                          className="w-full h-10 rounded-md border border-border bg-zinc-50 px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                          {...register("time")}
                        >
                          <option value="">Select time...</option>
                          {TIME_OPTIONS.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="h-12 px-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold gap-2"
              >
                <TbSearch className="w-4 h-4" />
                {isSubmitting ? "Launching..." : "Launch Intelligence Scan →"}
              </Button>
            </form>

            <p className="text-xs text-muted-foreground/50 mt-4">
              Mines Reddit, Product Hunt, Google Trends · ~3–5 minutes · Generates a full founder's dossier
            </p>
          </div>

          {/* Example chips */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground/60 uppercase tracking-widest mb-3">
              Try an example
            </p>
            <div className="flex flex-wrap gap-2">
              {EXAMPLE_TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setValue("topic", t, { shouldValidate: true })}
                  className="px-3 py-1.5 rounded-full border border-border text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground hover:bg-primary/5 transition-all"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Stage 2: Phase 1 Live Feed ────────────────────────────── */}
      {pageStage === "phase1_feed" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary/60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-primary" />
            </span>
            <h2 className="text-lg font-bold text-foreground">
              Intelligence Scan Running
            </h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Mining Reddit, Product Hunt, and the web for validated market gaps in{" "}
            <span className="font-semibold text-foreground">"{topic}"</span>…
          </p>
          <LiveFeedTerminal
            title="FluxIdeas — Phase 1: Market Scout"
            subtitle={topic}
            feedLines={feedLines}
            currentStage={currentAgentStage}
            isRunning={true}
          />
        </div>
      )}

      {/* ── Stage 3: Problem Selection ────────────────────────────── */}
      {pageStage === "problem_select" && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-foreground">
              Select a Market Gap to Investigate
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              The AI found these validated opportunities. Pick one to generate a full founder's dossier.
            </p>
          </div>

          {problems.length === 0 ? (
            <div className="rounded-2xl border border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">
                No problems were identified. Try a different topic.
              </p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={resetPage}
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {problems.map((problem, i) => (
                <ProblemCard
                  key={i}
                  problem={problem}
                  onSelect={() => onSelectProblem(problem, i)}
                  isLoading={selectingProblemIndex === i}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Stage 4a: Phase 2 Live Feed ───────────────────────────── */}
      {pageStage === "phase2_feed" && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-500/60" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-violet-500" />
            </span>
            <h2 className="text-lg font-bold text-foreground">
              Deep Dive Running
            </h2>
          </div>
          {dossier?.selected_problem && (
            <p className="text-sm text-muted-foreground">
              Generating full founder's dossier for{" "}
              <span className="font-semibold text-foreground">
                "{dossier.selected_problem.problem_name}"
              </span>
              …
            </p>
          )}
          <LiveFeedTerminal
            title="FluxIdeas — Phase 2: Deep Dive"
            subtitle={dossier?.selected_problem?.problem_name}
            feedLines={feedLines}
            currentStage={currentAgentStage}
            isRunning={true}
          />
        </div>
      )}

      {/* ── Stage 4b: Complete — Full Dossier ────────────────────── */}
      {pageStage === "complete" && dossier && dossier.selected_problem && (
        <div className="space-y-6">
          {/* Header */}
          <div className="rounded-2xl border border-green-200 bg-green-50 p-5 flex items-start gap-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-green-500/15 border border-green-500/30 shrink-0">
              <TbCheck className="w-5 h-5 text-green-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-green-700 uppercase tracking-widest mb-0.5">
                Founder's Dossier Ready
              </p>
              <h2 className="text-lg font-bold text-green-900 leading-snug">
                {dossier.selected_problem.problem_name}
              </h2>
              <p className="text-sm text-green-700 mt-1">
                {dossier.selected_problem.market_gap}
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-border">
            <div className="flex gap-0 overflow-x-auto">
              {DOSSIER_TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tab content */}
          <div>
            {activeTab === "opportunity" && (
              <OpportunityTab
                problem={dossier.selected_problem}
                blueprint={dossier.blueprint}
                marketSize={dossier.market_size_analysis}
              />
            )}
            {activeTab === "mvp" && (
              <MvpTab
                blueprint={dossier.blueprint}
                mockupUrl={dossier.mockup_url}
              />
            )}
            {activeTab === "build" && <BuildTab blueprint={dossier.blueprint} />}
            {activeTab === "risks" && (
              <RisksTab riskAssessment={dossier.risk_assessment} />
            )}
          </div>

          {/* Export buttons */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-border">
            {dossier.pdf_url && (
              <Button
                asChild
                className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold gap-2"
              >
                <a href={dossier.pdf_url} target="_blank" rel="noopener noreferrer">
                  <TbDownload className="w-4 h-4" />
                  Download PDF
                </a>
              </Button>
            )}
            {dossier.pptx_url && (
              <Button
                asChild
                variant="outline"
                className="rounded-full font-semibold gap-2"
              >
                <a href={dossier.pptx_url} target="_blank" rel="noopener noreferrer">
                  <TbPresentation className="w-4 h-4" />
                  Download Pitch Deck
                </a>
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={resetPage}
              className="rounded-full gap-2 text-muted-foreground"
            >
              <TbRefresh className="w-4 h-4" />
              New Scan
            </Button>
          </div>
        </div>
      )}

      {/* ── Error state ───────────────────────────────────────────── */}
      {pageStage === "error" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center space-y-4">
          <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-red-100 border border-red-200 mx-auto">
            <TbAlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <h3 className="font-bold text-red-900 text-base mb-1">Something went wrong</h3>
            <p className="text-sm text-red-700">
              {errorMessage || "An unexpected error occurred. Please try again."}
            </p>
          </div>
          <Button
            onClick={resetPage}
            className="rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold gap-2"
          >
            <TbRefresh className="w-4 h-4" />
            Try Again
          </Button>
        </div>
      )}

    </div>
  );
}
