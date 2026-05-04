import { useState, useEffect } from "react";
import type { IconType } from "react-icons";
import { Link } from "react-router";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Input } from "@/shared/ui/input";
import {
  TbFileReport,
  TbSearch,
  TbClock,
  TbTrendingUp,
  TbArrowRight,
  TbExternalLink,
  TbPlus,
  TbLoader2,
} from "react-icons/tb";
import { RESEARCH_SESSION_STORAGE_KEY } from "@/shared/constants/application-wide.constants";

const BACKEND_URL = import.meta.env.VITE_API_URL as string;

/* ── Types ────────────────────────────────────────────────────── */

interface DashboardStatCardData {
  statLabel: string;
  statValue: string;
  statSubtext: string;
  statIcon: IconType;
  statIconColorClass: string;
  statIconBgClass: string;
}

interface ReportRecord {
  id: string;
  topicQuery: string;
  createdAt: string;
  pdfDownloadUrl: string | null;
  topValidatedProblems: {
    selected_problem?: { problem_name: string; market_score?: number };
  } | null;
}

function DashboardStatCard({ data }: { data: DashboardStatCardData }) {
  const StatIcon = data.statIcon;
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-2">
              {data.statLabel}
            </p>
            <p className="text-3xl font-extrabold text-foreground tabular-nums mb-0.5">
              {data.statValue}
            </p>
            <p className="text-xs text-muted-foreground/60">{data.statSubtext}</p>
          </div>
          <div
            className={`flex items-center justify-center w-10 h-10 rounded-xl border shrink-0 ${data.statIconBgClass}`}
          >
            <StatIcon className={`w-5 h-5 ${data.statIconColorClass}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── Recent reports table (real data) ────────────────────────── */

function formatRelativeTime(isoString: string) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function RecentReportsTable({ reports }: { reports: ReportRecord[] }) {
  const recent = reports.slice(0, 5);
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">Recent Research</CardTitle>
          <Button variant="ghost" size="sm" asChild className="text-xs text-muted-foreground">
            <Link to="/dashboard/reports">
              View all <TbArrowRight className="w-3.5 h-3.5 ml-1" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {recent.length === 0 ? (
          <div className="py-10 text-center text-sm text-muted-foreground/50">
            No research yet — run your first one above.
          </div>
        ) : (
          <div className="space-y-0">
            {recent.map((report, idx) => {
              const score = report.topValidatedProblems?.selected_problem?.market_score;
              return (
                <div
                  key={report.id}
                  className={`flex items-center gap-4 py-3.5 ${idx < recent.length - 1 ? "border-b border-border/40" : ""}`}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{report.topicQuery}</p>
                    <p className="text-xs text-muted-foreground/60 mt-0.5">
                      {formatRelativeTime(report.createdAt)}
                      {report.topValidatedProblems?.selected_problem?.problem_name && (
                        <> · {report.topValidatedProblems.selected_problem.problem_name}</>
                      )}
                    </p>
                  </div>
                  {score !== undefined && (
                    <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                      <span className="text-xs text-muted-foreground/50">Score</span>
                      <span className="text-sm font-bold text-foreground tabular-nums">{score}</span>
                      <span className="text-xs text-muted-foreground/40">/10</span>
                    </div>
                  )}
                  <Badge variant="outline" className="text-[10px] shrink-0 text-green-700 bg-green-50 border-green-200">
                    Done
                  </Badge>
                  <Button variant="ghost" size="icon" className="shrink-0 w-7 h-7 text-muted-foreground/50 hover:text-foreground" asChild>
                    <Link to={`/dashboard/reports/${report.id}`}>
                      <TbExternalLink className="w-3.5 h-3.5" />
                    </Link>
                  </Button>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ── New research input card ──────────────────────────────────── */

function useActiveResearchSession() {
  const [inProgress, setInProgress] = useState(false);
  const [topic, setTopic] = useState<string | null>(null);

  useEffect(() => {
    const stored = sessionStorage.getItem(RESEARCH_SESSION_STORAGE_KEY);
    if (!stored) return;
    try {
      const s = JSON.parse(stored) as { pageStage?: string; topic?: string };
      const active = s.pageStage === "phase1_feed" || s.pageStage === "phase2_feed";
      setInProgress(active);
      if (active && s.topic) setTopic(s.topic);
    } catch { /* ignore */ }
  }, []);

  return { inProgress, topic };
}

function NewResearchInputCard({ disabled }: { disabled?: boolean }) {
  return (
    <div
      className="relative rounded-2xl border border-primary/20 p-6 overflow-hidden"
      style={{
        background:
          "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.75 0.12 270 / 0.10), transparent 70%), oklch(0.99 0 0)",
      }}
    >
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px"
        style={{
          background:
            "linear-gradient(90deg, transparent, oklch(0.58 0.26 270 / 0.5), transparent)",
        }}
      />

      <div className="relative">
        <p className="text-xs font-bold text-brand-light uppercase tracking-widest mb-1">
          Start a research
        </p>
        <h2 className="text-xl font-bold text-foreground mb-4">
          What market do you want to explore?
        </h2>

        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder='e.g. "productivity tools for remote teams"'
            disabled={disabled}
            className="flex-1 h-11 border-border bg-white focus-visible:ring-primary/30 disabled:opacity-50"
          />
          <Button
            asChild={!disabled}
            disabled={disabled}
            className="h-11 px-6 bg-primary hover:bg-primary/85 text-primary-foreground font-semibold gap-2 shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {disabled ? (
              <span><TbPlus className="w-4 h-4" />Run Research</span>
            ) : (
              <Link to="/dashboard/research">
                <TbPlus className="w-4 h-4" />
                Run Research
              </Link>
            )}
          </Button>
        </div>

        <p className="text-xs text-muted-foreground/50 mt-3">
          Takes ~5 minutes · Mines Reddit, Product Hunt, Google Trends · Generates a PDF report
        </p>
      </div>
    </div>
  );
}

/* ── Page ─────────────────────────────────────────────────────── */

export default function UserDashboardOverviewPage() {
  const { inProgress, topic } = useActiveResearchSession();
  const [reports, setReports] = useState<ReportRecord[]>([]);

  useEffect(() => {
    fetch(`${BACKEND_URL}/api/reports`, { credentials: "include" })
      .then((r) => r.json())
      .then((body: { data?: ReportRecord[] }) => {
        if (body.data) setReports(body.data);
      })
      .catch(() => {});
  }, []);

  const reportCount = reports.length;
  const avgScore = reportCount > 0
    ? (reports.reduce((sum, r) => sum + (r.topValidatedProblems?.selected_problem?.market_score ?? 0), 0) / reportCount).toFixed(1)
    : "—";
  const timeSaved = reportCount > 0 ? `${reportCount * 15} hrs` : "0 hrs";

  const statCards: DashboardStatCardData[] = [
    {
      statLabel: "Total Researches",
      statValue: String(reportCount),
      statSubtext: reportCount === 0 ? "Start your first one below" : `${reportCount} completed`,
      statIcon: TbSearch,
      statIconColorClass: "text-violet-600",
      statIconBgClass: "bg-violet-50 border-violet-200",
    },
    {
      statLabel: "Reports Generated",
      statValue: String(reportCount),
      statSubtext: "PDF reports ready to download",
      statIcon: TbFileReport,
      statIconColorClass: "text-blue-600",
      statIconBgClass: "bg-blue-50 border-blue-200",
    },
    {
      statLabel: "Avg. Opportunity Score",
      statValue: avgScore === "—" ? "—" : `${avgScore}/10`,
      statSubtext: "Across all validated problems",
      statIcon: TbTrendingUp,
      statIconColorClass: "text-green-600",
      statIconBgClass: "bg-green-50 border-green-200",
    },
    {
      statLabel: "Research Time Saved",
      statValue: timeSaved,
      statSubtext: "vs. manual product research",
      statIcon: TbClock,
      statIconColorClass: "text-amber-600",
      statIconBgClass: "bg-amber-50 border-amber-200",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Welcome back — discover your next big opportunity.
          </p>
        </div>
        {inProgress ? (
          <Button asChild className="bg-amber-500 hover:bg-amber-600 text-white font-semibold gap-2 sm:shrink-0">
            <Link to="/dashboard/research">
              <TbLoader2 className="w-4 h-4 animate-spin" />
              Research Running
            </Link>
          </Button>
        ) : (
          <Button asChild className="bg-primary hover:bg-primary/85 text-primary-foreground font-semibold gap-2 sm:shrink-0">
            <Link to="/dashboard/research">
              <TbPlus className="w-4 h-4" />
              New Research
            </Link>
          </Button>
        )}
      </div>

      {/* In-progress banner */}
      {inProgress && (
        <div className="flex items-center justify-between gap-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div className="flex items-center gap-3 min-w-0">
            <TbLoader2 className="w-4 h-4 text-amber-600 animate-spin shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-amber-900">Analysis in progress</p>
              {topic && <p className="text-xs text-amber-700 truncate">"{topic}"</p>}
            </div>
          </div>
          <Button asChild size="sm" variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100 shrink-0">
            <Link to="/dashboard/research">View live feed</Link>
          </Button>
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((statCardData) => (
          <DashboardStatCard key={statCardData.statLabel} data={statCardData} />
        ))}
      </div>

      {/* New research input */}
      <NewResearchInputCard disabled={inProgress} />

      {/* Recent reports */}
      <RecentReportsTable reports={reports} />

    </div>
  );
}
