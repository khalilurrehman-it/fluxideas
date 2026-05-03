import { useState, useEffect } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { TbFileReport, TbExternalLink, TbTrash, TbPlus, TbSearch } from "react-icons/tb";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";

const BACKEND_URL = import.meta.env.VITE_API_URL as string;

interface ReportRow {
  id: string;
  searchId: string;
  topicQuery: string;
  pdfDownloadUrl: string | null;
  topValidatedProblems: unknown;
  createdAt: string;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getProblemName(topValidatedProblems: unknown): string {
  if (!topValidatedProblems || typeof topValidatedProblems !== "object") return "—";
  const data = topValidatedProblems as Record<string, unknown>;
  const problem = data.selected_problem as Record<string, unknown> | undefined;
  return (problem?.problem_name as string) ?? "—";
}

function getMarketScore(topValidatedProblems: unknown): number | null {
  if (!topValidatedProblems || typeof topValidatedProblems !== "object") return null;
  const data = topValidatedProblems as Record<string, unknown>;
  const problem = data.selected_problem as Record<string, unknown> | undefined;
  const score = problem?.market_score ?? problem?.urgency_score;
  return typeof score === "number" ? Math.round(score * 10) : null;
}

export default function UserReportsPage() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchReports() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/reports`, { credentials: "include" });
        if (!res.ok) throw new Error("Failed to load reports");
        const data = await res.json() as { data: ReportRow[] };
        setReports(data.data ?? []);
      } catch {
        toast.error("Could not load your reports.");
      } finally {
        setIsLoading(false);
      }
    }
    void fetchReports();
  }, []);

  async function handleDelete(reportId: string) {
    setDeletingId(reportId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/reports/${reportId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (!res.ok) throw new Error();
      setReports((prev) => prev.filter((r) => r.id !== reportId));
      toast.success("Report deleted.");
    } catch {
      toast.error("Failed to delete report.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            All your market research reports in one place.
          </p>
        </div>
        <Button
          asChild
          className="bg-primary hover:bg-primary/85 text-primary-foreground font-semibold gap-2 sm:shrink-0"
        >
          <Link to="/dashboard/research">
            <TbPlus className="w-4 h-4" />
            New Research
          </Link>
        </Button>
      </div>

      {/* Reports list */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TbFileReport className="w-4 h-4 text-primary" />
            Research Reports
            {!isLoading && (
              <Badge variant="outline" className="text-[10px] ml-1">
                {reports.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-16 flex flex-col items-center gap-3 text-muted-foreground/50">
              <div className="w-6 h-6 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              <p className="text-sm">Loading reports…</p>
            </div>
          ) : reports.length === 0 ? (
            <div className="py-16 flex flex-col items-center gap-4 text-center">
              <div className="w-14 h-14 rounded-2xl bg-muted/60 flex items-center justify-center">
                <TbSearch className="w-7 h-7 text-muted-foreground/40" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">No reports yet</p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  Run your first market research to generate a report.
                </p>
              </div>
              <Button asChild size="sm" className="bg-primary text-primary-foreground gap-2">
                <Link to="/dashboard/research">
                  <TbPlus className="w-3.5 h-3.5" /> Start Research
                </Link>
              </Button>
            </div>
          ) : (
            <div className="divide-y divide-border/40">
              {reports.map((report) => {
                const score = getMarketScore(report.topValidatedProblems);
                const problemName = getProblemName(report.topValidatedProblems);
                return (
                  <div key={report.id} className="flex items-start gap-4 py-4">

                    {/* Icon */}
                    <div className="w-9 h-9 rounded-xl bg-primary/8 border border-primary/15 flex items-center justify-center shrink-0 mt-0.5">
                      <TbFileReport className="w-4 h-4 text-primary" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate capitalize">
                        {report.topicQuery}
                      </p>
                      <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                        {problemName}
                      </p>
                      <p className="text-xs text-muted-foreground/40 mt-1">
                        {formatDate(report.createdAt)}
                      </p>
                    </div>

                    {/* Score */}
                    {score !== null && (
                      <div className="hidden sm:flex flex-col items-center shrink-0">
                        <span className="text-lg font-extrabold text-foreground tabular-nums leading-none">
                          {score}
                        </span>
                        <span className="text-[9px] text-muted-foreground/40 uppercase tracking-wider">
                          /100
                        </span>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="w-8 h-8" asChild>
                        <Link to={`/dashboard/reports/${report.id}`}>
                          <TbExternalLink className="w-3.5 h-3.5 text-muted-foreground/60" />
                        </Link>
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 hover:bg-red-50 hover:text-red-500"
                        disabled={deletingId === report.id}
                        onClick={() => void handleDelete(report.id)}
                      >
                        {deletingId === report.id ? (
                          <div className="w-3 h-3 border border-red-400 border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <TbTrash className="w-3.5 h-3.5" />
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
