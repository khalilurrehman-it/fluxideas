import type { IconType } from "react-icons";
import { useState, useEffect } from "react";
import { Badge } from "@/shared/ui/badge";
import { BsSearch, BsBraces, BsCheckCircle, BsFilePdf } from "react-icons/bs";
import { TbBrain, TbClock, TbFileReport } from "react-icons/tb";
import { BsArrowRight } from "react-icons/bs";

/* ── Agent feed demo data ─────────────────────────────────────── */

interface AgentFeedDemoLogLine {
  stageLabel: string;
  stageBadgeColorClass: string;
  messageText: string;
}

const AGENT_FEED_DEMO_LOG_LINES: AgentFeedDemoLogLine[] = [
  { stageLabel: "SCRAPING",   stageBadgeColorClass: "text-blue-400 bg-blue-400/10 border-blue-400/30",       messageText: "🔍  Connecting to Reddit API..." },
  { stageLabel: "SCRAPING",   stageBadgeColorClass: "text-blue-400 bg-blue-400/10 border-blue-400/30",       messageText: "🔍  r/entrepreneur — 247 posts found" },
  { stageLabel: "SCRAPING",   stageBadgeColorClass: "text-blue-400 bg-blue-400/10 border-blue-400/30",       messageText: "🔍  r/digitalnomad — 183 posts found" },
  { stageLabel: "SCRAPING",   stageBadgeColorClass: "text-blue-400 bg-blue-400/10 border-blue-400/30",       messageText: "🔍  Product Hunt discussions... (94 found)" },
  { stageLabel: "SCRAPING",   stageBadgeColorClass: "text-blue-400 bg-blue-400/10 border-blue-400/30",       messageText: "🔍  Google Trends data collected ✓" },
  { stageLabel: "CLUSTERING", stageBadgeColorClass: "text-purple-400 bg-purple-400/10 border-purple-400/30", messageText: "🧠  Claude analyzing 524 raw posts..." },
  { stageLabel: "CLUSTERING", stageBadgeColorClass: "text-purple-400 bg-purple-400/10 border-purple-400/30", messageText: "🧠  12 distinct problem clusters identified" },
  { stageLabel: "VALIDATING", stageBadgeColorClass: "text-green-400 bg-green-400/10 border-green-400/30",    messageText: '✅  "No async standup tool that gets adopted"' },
  { stageLabel: "VALIDATING", stageBadgeColorClass: "text-green-400 bg-green-400/10 border-green-400/30",    messageText: "    Market: ~$840M  ·  Opportunity score: 87/100" },
  { stageLabel: "VALIDATING", stageBadgeColorClass: "text-green-400 bg-green-400/10 border-green-400/30",    messageText: '✅  "Video call fatigue — no tool reduces meetings"' },
  { stageLabel: "VALIDATING", stageBadgeColorClass: "text-green-400 bg-green-400/10 border-green-400/30",    messageText: "    Market: ~$1.2B  ·  Opportunity score: 74/100" },
  { stageLabel: "GENERATING", stageBadgeColorClass: "text-amber-400 bg-amber-400/10 border-amber-400/30",    messageText: "📊  Generating your PDF report..." },
  { stageLabel: "DONE",       stageBadgeColorClass: "text-green-400 bg-green-400/10 border-green-400/30",    messageText: "✅  Report ready! 5 problems validated." },
];

const AGENT_FEED_LINE_REVEAL_INTERVAL_MS = 480;
const AGENT_FEED_LOOP_RESTART_DELAY_MS = 3200;

/* ── Pipeline step definitions ────────────────────────────────── */

interface AgentPipelineStepData {
  stepNumber: number;
  stepIcon: IconType;
  stepIconColorClass: string;
  stepIconBgClass: string;
  stepTitle: string;
  stepDescription: string;
}

const AGENT_PIPELINE_STEPS: AgentPipelineStepData[] = [
  {
    stepNumber: 1,
    stepIcon: BsSearch,
    stepIconColorClass: "text-blue-500",
    stepIconBgClass: "bg-blue-50 border-blue-200",
    stepTitle: "Scrape",
    stepDescription:
      "Agent 1 mines Reddit threads, Product Hunt discussions, Google Trends, and the open web to collect raw complaints at scale.",
  },
  {
    stepNumber: 2,
    stepIcon: BsBraces,
    stepIconColorClass: "text-purple-500",
    stepIconBgClass: "bg-purple-50 border-purple-200",
    stepTitle: "Cluster",
    stepDescription:
      "Agent 2 sends all posts to Claude, which groups overlapping complaints into distinct, named problem patterns.",
  },
  {
    stepNumber: 3,
    stepIcon: BsCheckCircle,
    stepIconColorClass: "text-green-600",
    stepIconBgClass: "bg-green-50 border-green-200",
    stepTitle: "Validate",
    stepDescription:
      "Agent 3 scores each cluster — checks existing solutions, estimates market size, and assigns an opportunity gap score out of 100.",
  },
  {
    stepNumber: 4,
    stepIcon: BsFilePdf,
    stepIconColorClass: "text-amber-600",
    stepIconBgClass: "bg-amber-50 border-amber-200",
    stepTitle: "Report",
    stepDescription:
      "Agent 4 compiles the top 5 problems into a professional PDF with competitor landscapes, MVP ideas, and opportunity scores.",
  },
];

/* ── Animated terminal mockup ─────────────────────────────────── */

function AgentFeedTerminalMockup() {
  const [numberOfVisibleLogLines, setNumberOfVisibleLogLines] = useState(0);

  useEffect(() => {
    const allLinesAreVisible = numberOfVisibleLogLines >= AGENT_FEED_DEMO_LOG_LINES.length;
    const timerId = setTimeout(
      () => {
        if (allLinesAreVisible) {
          setNumberOfVisibleLogLines(0);
        } else {
          setNumberOfVisibleLogLines((prev) => prev + 1);
        }
      },
      allLinesAreVisible ? AGENT_FEED_LOOP_RESTART_DELAY_MS : AGENT_FEED_LINE_REVEAL_INTERVAL_MS
    );
    return () => clearTimeout(timerId);
  }, [numberOfVisibleLogLines]);

  const isLastLineVisible = numberOfVisibleLogLines === AGENT_FEED_DEMO_LOG_LINES.length;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden font-mono text-sm h-full flex flex-col">
      {/* Title bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 bg-zinc-900/60 shrink-0">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-radar-ring absolute inline-flex h-full w-full rounded-full bg-green-400/60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-green-400" />
          </span>
          <span className="text-xs text-zinc-400">FluxIdeas Agent Pipeline</span>
        </div>
        <span className="text-xs text-zinc-600 italic">topic: remote work tools</span>
      </div>

      {/* Log lines */}
      <div className="p-4 space-y-1.5 flex-1 min-h-75">
        {AGENT_FEED_DEMO_LOG_LINES.slice(0, numberOfVisibleLogLines).map(
          (demoLogLine, lineIndex) => (
            <div
              key={lineIndex}
              className="flex items-start gap-3 animate-feed-line-enter"
            >
              <span className="text-zinc-600 shrink-0 select-none">{">"}</span>
              <Badge
                variant="outline"
                className={`text-[10px] px-1.5 py-0 shrink-0 font-mono ${demoLogLine.stageBadgeColorClass}`}
              >
                {demoLogLine.stageLabel}
              </Badge>
              <span className="text-zinc-200 leading-relaxed">{demoLogLine.messageText}</span>
            </div>
          )
        )}
        {numberOfVisibleLogLines > 0 && (
          <div className="flex items-center gap-3">
            <span className="text-zinc-600 select-none">{">"}</span>
            <span
              className={`inline-block w-2 h-4 bg-green-400/80 animate-terminal-cursor ${
                isLastLineVisible ? "opacity-100" : "opacity-70"
              }`}
            />
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Pipeline steps list (right column) ──────────────────────── */

function AgentPipelineStepsList() {
  return (
    <div className="flex flex-col gap-0 h-full">
      {AGENT_PIPELINE_STEPS.map((step, stepIndex) => {
        const StepIcon = step.stepIcon;
        const isLast = stepIndex === AGENT_PIPELINE_STEPS.length - 1;
        return (
          <div key={step.stepNumber} className="flex gap-4">
            {/* Left: number + connector line */}
            <div className="flex flex-col items-center shrink-0">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-xl border ${step.stepIconBgClass} shrink-0`}
              >
                <StepIcon className={`w-4.5 h-4.5 ${step.stepIconColorClass}`} />
              </div>
              {!isLast && (
                <div className="w-px flex-1 min-h-5 bg-border/60 my-1" />
              )}
            </div>

            {/* Right: content */}
            <div className={`pb-6 pt-1 ${isLast ? "pb-0" : ""}`}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-bold text-muted-foreground/40 tabular-nums">
                  0{step.stepNumber}
                </span>
                <h3 className="text-sm font-bold text-foreground">
                  Agent {step.stepNumber} — {step.stepTitle}
                </h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                {step.stepDescription}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Bottom feature cards ─────────────────────────────────────── */

function ClaudeAiFeatureCard() {
  return (
    <div className="h-full rounded-2xl border border-violet-200 bg-linear-to-br from-violet-50 to-purple-50 p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-violet-600 shrink-0">
          <TbBrain className="w-4.5 h-4.5 text-white" />
        </div>
        <span className="text-xs font-bold text-violet-700 uppercase tracking-widest">
          Powered by Claude AI
        </span>
      </div>
      <p className="text-sm text-zinc-700 leading-relaxed mb-3">
        Claude reads thousands of posts and finds the signal in the noise — grouping
        raw complaints into distinct, named problem patterns with zero manual input.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {["Clustering", "Validation", "Market sizing"].map((tag) => (
          <span
            key={tag}
            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
}

function SpeedFeatureCard() {
  return (
    <div className="h-full rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <TbClock className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          Time to Insight
        </span>
      </div>
      <div className="flex items-end gap-1.5 mb-1">
        <span className="text-4xl font-extrabold text-foreground tabular-nums leading-none">
          &lt; 5
        </span>
        <span className="text-lg text-muted-foreground font-semibold mb-0.5">min</span>
      </div>
      <p className="text-xs text-muted-foreground">
        vs. 3 weeks for a product manager doing this manually
      </p>
    </div>
  );
}

function PdfExportFeatureCard() {
  return (
    <div className="h-full rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <BsFilePdf className="w-4 h-4 text-amber-500 shrink-0" />
        <span className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
          PDF Report
        </span>
      </div>
      <p className="text-xl font-bold text-foreground mb-2">Export ready</p>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
        Investor-grade report with competitor landscapes, MVP ideas, and market estimates.
      </p>
      <div className="flex items-center gap-1.5 text-xs font-semibold text-violet-600">
        <TbFileReport className="w-4 h-4" />
        Download PDF
        <BsArrowRight className="w-3 h-3" />
      </div>
    </div>
  );
}

/* ── Main section ─────────────────────────────────────────────── */

export function LandingAgentPipelineFeaturesSection() {
  return (
    <section className="py-24 px-6 bg-zinc-50/60">
      <div className="max-w-6xl mx-auto">

        {/* Section header */}
        <div className="text-center mb-12">
          <p className="text-sm font-semibold text-brand-light uppercase tracking-widest mb-3">
            How it works
          </p>
          <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            From idea to insight in minutes
          </h2>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto">
            Four specialized AI agents run in sequence. You watch it happen live.
          </p>
        </div>

        {/* Main 2-column: terminal + pipeline steps */}
        <div className="grid lg:grid-cols-[1fr_1fr] gap-8 items-start mb-6">

          {/* Left: animated terminal */}
          <div className="lg:sticky lg:top-24">
            <AgentFeedTerminalMockup />
            <p className="mt-2 text-center text-xs text-muted-foreground/40 italic">
              Live demo · restarts automatically
            </p>
          </div>

          {/* Right: 4 numbered pipeline steps */}
          <div className="pt-2">
            <AgentPipelineStepsList />
          </div>

        </div>

        {/* Bottom row: 3 equal-height feature cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <ClaudeAiFeatureCard />
          <SpeedFeatureCard />
          <PdfExportFeatureCard />
        </div>

      </div>
    </section>
  );
}
