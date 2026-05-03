import { useState, useEffect } from "react";
import { useParams, Link } from "react-router";
import { toast } from "sonner";
import {
  TbArrowLeft,
  TbFileReport,
  TbDownload,
  TbExternalLink,
  TbTrendingUp,
  TbBulb,
  TbShield,
  TbUsers,
  TbCurrencyDollar,
  TbAlertTriangle,
  TbCheck,
  TbLink,
} from "react-icons/tb";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Separator } from "@/shared/ui/separator";

const BACKEND_URL = import.meta.env.VITE_API_URL as string;

interface SourceRef {
  author?: string;
  url?: string;
  title?: string;
}

interface SelectedProblem {
  problem_name: string;
  description?: string;
  market_gap?: string;
  target_customer?: string;
  urgency_score?: number;
  commercial_potential?: number;
  feasibility_score?: number;
  founder_fit_score?: number;
  market_score?: number;
  sentiment?: string;
  source_refs?: SourceRef[];
}

interface MarketSizeAnalysis {
  tam?: string;
  sam?: string;
  som?: string;
}

interface Blueprint {
  mvp_features?: string[];
  tech_stack?: string[];
  go_to_market?: string;
  revenue_model?: string;
  [key: string]: unknown;
}

interface RiskAssessment {
  risks?: Array<{ risk: string; mitigation?: string }>;
  overall_risk?: string;
  [key: string]: unknown;
}

interface ReportData {
  id: string;
  searchId: string;
  topicQuery: string;
  pdfDownloadUrl: string | null;
  topValidatedProblems: {
    selected_problem?: SelectedProblem;
    market_size_analysis?: MarketSizeAnalysis;
    blueprint?: Blueprint;
    risk_assessment?: RiskAssessment;
    mockup_url?: string;
  } | null;
  createdAt: string;
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round(value * 10);
  const color =
    pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-amber-400" : "bg-red-400";
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-xs font-bold tabular-nums">{pct}/100</span>
      </div>
      <div className="h-1.5 rounded-full bg-muted/60 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function UserReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const [report, setReport] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!reportId) return;
    async function fetchReport() {
      try {
        const res = await fetch(`${BACKEND_URL}/api/reports/${reportId}`, {
          credentials: "include",
        });
        if (!res.ok) throw new Error();
        const json = await res.json() as { data: ReportData };
        setReport(json.data);
      } catch {
        toast.error("Could not load this report.");
      } finally {
        setIsLoading(false);
      }
    }
    void fetchReport();
  }, [reportId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-3 text-muted-foreground/50">
          <div className="w-7 h-7 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
          <p className="text-sm">Loading report…</p>
        </div>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="max-w-5xl mx-auto py-20 text-center space-y-4">
        <TbFileReport className="w-12 h-12 text-muted-foreground/30 mx-auto" />
        <p className="text-sm text-muted-foreground">Report not found.</p>
        <Button variant="outline" size="sm" asChild>
          <Link to="/dashboard/reports"><TbArrowLeft className="w-3.5 h-3.5 mr-1" /> Back</Link>
        </Button>
      </div>
    );
  }

  const tvp = report.topValidatedProblems;
  const problem = tvp?.selected_problem;
  const market = tvp?.market_size_analysis;
  const blueprint = tvp?.blueprint;
  const risk = tvp?.risk_assessment;
  const mockupUrl = tvp?.mockup_url;

  return (
    <div className="max-w-5xl mx-auto space-y-8">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="space-y-1">
          <Button variant="ghost" size="sm" asChild className="-ml-2 text-muted-foreground mb-1">
            <Link to="/dashboard/reports">
              <TbArrowLeft className="w-3.5 h-3.5 mr-1" /> All Reports
            </Link>
          </Button>
          <h1 className="text-2xl font-bold text-foreground capitalize">{report.topicQuery}</h1>
          <p className="text-sm text-muted-foreground">
            {new Date(report.createdAt).toLocaleDateString("en-US", {
              month: "long", day: "numeric", year: "numeric",
            })}
          </p>
        </div>
        {report.pdfDownloadUrl && (
          <Button
            asChild
            className="bg-primary hover:bg-primary/85 text-primary-foreground font-semibold gap-2 shrink-0"
          >
            <a href={report.pdfDownloadUrl} target="_blank" rel="noopener noreferrer">
              <TbDownload className="w-4 h-4" /> Download PDF
            </a>
          </Button>
        )}
      </div>

      {/* Problem summary */}
      {problem && (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/3 to-transparent">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TbBulb className="w-4 h-4 text-primary" />
              Top Opportunity Identified
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-foreground">{problem.problem_name}</h2>
              {problem.description && (
                <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">
                  {problem.description}
                </p>
              )}
              {problem.market_gap && (
                <p className="text-sm text-foreground/80 mt-2 leading-relaxed">
                  {problem.market_gap}
                </p>
              )}
            </div>

            {problem.target_customer && (
              <div className="flex items-start gap-2">
                <TbUsers className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{problem.target_customer}</p>
              </div>
            )}

            {/* Scores */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {problem.market_score != null && (
                <ScoreBar label="Market Score" value={problem.market_score} />
              )}
              {problem.urgency_score != null && (
                <ScoreBar label="Urgency" value={problem.urgency_score} />
              )}
              {problem.commercial_potential != null && (
                <ScoreBar label="Commercial Potential" value={problem.commercial_potential} />
              )}
              {problem.feasibility_score != null && (
                <ScoreBar label="Feasibility" value={problem.feasibility_score} />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Market Size */}
        {market && (market.tam || market.sam || market.som) && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TbCurrencyDollar className="w-4 h-4 text-green-600" />
                Market Size
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "TAM", sublabel: "Total Addressable", value: market.tam, color: "bg-green-100 text-green-800" },
                { label: "SAM", sublabel: "Serviceable", value: market.sam, color: "bg-blue-100 text-blue-800" },
                { label: "SOM", sublabel: "Obtainable", value: market.som, color: "bg-violet-100 text-violet-800" },
              ].map(({ label, sublabel, value, color }) =>
                value ? (
                  <div key={label} className="flex items-center justify-between">
                    <div>
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${color}`}>
                        {label}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">{sublabel}</span>
                    </div>
                    <span className="text-sm font-semibold text-foreground">{value}</span>
                  </div>
                ) : null
              )}
            </CardContent>
          </Card>
        )}

        {/* MVP Blueprint */}
        {blueprint && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TbTrendingUp className="w-4 h-4 text-blue-600" />
                MVP Blueprint
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {blueprint.revenue_model && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Revenue Model</p>
                  <p className="text-sm text-foreground">{blueprint.revenue_model}</p>
                </div>
              )}
              {blueprint.go_to_market && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">Go-to-Market</p>
                  <p className="text-sm text-foreground">{blueprint.go_to_market}</p>
                </div>
              )}
              {Array.isArray(blueprint.mvp_features) && blueprint.mvp_features.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Core Features</p>
                  <ul className="space-y-1">
                    {blueprint.mvp_features.map((f, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm">
                        <TbCheck className="w-3.5 h-3.5 text-green-500 shrink-0 mt-0.5" />
                        {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Risk Assessment */}
        {risk && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TbShield className="w-4 h-4 text-amber-600" />
                Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {risk.overall_risk && (
                <div className="flex items-center gap-2">
                  <TbAlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-sm text-foreground">{risk.overall_risk}</span>
                </div>
              )}
              {Array.isArray(risk.risks) && risk.risks.length > 0 && (
                <ul className="space-y-2">
                  {risk.risks.map((r, i) => (
                    <li key={i} className="text-sm border-l-2 border-amber-200 pl-3">
                      <p className="font-medium text-foreground">{r.risk}</p>
                      {r.mitigation && (
                        <p className="text-xs text-muted-foreground mt-0.5">{r.mitigation}</p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}

        {/* AI Mockup */}
        {mockupUrl && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <TbBulb className="w-4 h-4 text-violet-600" />
                AI-Generated UI Mockup
              </CardTitle>
            </CardHeader>
            <CardContent>
              <img
                src={mockupUrl}
                alt="AI UI mockup"
                className="rounded-lg w-full object-cover border border-border/50"
                loading="lazy"
              />
            </CardContent>
          </Card>
        )}
      </div>

      {/* Source links */}
      {problem?.source_refs && problem.source_refs.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <TbLink className="w-4 h-4 text-muted-foreground" />
              Source References
              <Badge variant="outline" className="text-[10px] ml-1">
                {problem.source_refs.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Separator className="mb-3" />
            <div className="space-y-2">
              {problem.source_refs.map((ref, i) => (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <TbExternalLink className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    {ref.url ? (
                      <a
                        href={ref.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline truncate block"
                      >
                        {ref.title ?? ref.url}
                      </a>
                    ) : (
                      <span className="text-foreground truncate block">{ref.title ?? "—"}</span>
                    )}
                    {ref.author && (
                      <span className="text-xs text-muted-foreground/60">by {ref.author}</span>
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
