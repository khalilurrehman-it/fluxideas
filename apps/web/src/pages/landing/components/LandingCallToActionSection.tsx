import { Link } from "react-router";
import { Button } from "@/shared/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { Badge } from "@/shared/ui/badge";
import { Separator } from "@/shared/ui/separator";
import { BsArrowRight, BsCheckCircle, BsLightbulb, BsPeople } from "react-icons/bs";
import { AiOutlineDollar } from "react-icons/ai";
import { TbRadar2 } from "react-icons/tb";

/* ── Sample validated problem cards ──────────────────────────── */

interface SampleValidatedProblemCardData {
  problemTitle: string;
  problemDescription: string;
  evidencePostCount: number;
  estimatedMarketSizeDisplay: string;
  opportunityGapScore: number;
  topMinimumViableProductIdea: string;
}

const SAMPLE_VALIDATED_PROBLEM_CARDS_DATA: SampleValidatedProblemCardData[] = [
  {
    problemTitle: "No async standup tool that teams actually adopt",
    problemDescription:
      "Remote teams are forced to use Slack bots or Notion forms for async standups, but participation drops within 2 weeks. Nobody has solved the habit-formation problem.",
    evidencePostCount: 156,
    estimatedMarketSizeDisplay: "~$840M",
    opportunityGapScore: 87,
    topMinimumViableProductIdea:
      "AI-powered standup that integrates with existing tools and nudges at the right time",
  },
  {
    problemTitle: "Video call fatigue — no tool reduces meeting count",
    problemDescription:
      "Professionals report spending 4–6 hours/day in meetings with no automated way to convert recurring sync calls into async updates. Tools exist but none create behavioral change.",
    evidencePostCount: 89,
    estimatedMarketSizeDisplay: "~$1.2B",
    opportunityGapScore: 74,
    topMinimumViableProductIdea:
      "Meeting audit tool that automatically suggests which calls can be replaced with async docs",
  },
  {
    problemTitle: "Freelancers have no good invoicing tool that does tax too",
    problemDescription:
      "Freelancers juggle separate tools for invoicing, expense tracking, and tax prep. No single product solves the full workflow, especially for multi-currency international freelancers.",
    evidencePostCount: 203,
    estimatedMarketSizeDisplay: "~$2.4B",
    opportunityGapScore: 91,
    topMinimumViableProductIdea:
      "All-in-one invoicing + tax prep app auto-connected to Stripe/PayPal with quarterly tax estimates",
  },
];

function SampleValidatedProblemCard({
  cardData,
  rankPosition,
}: {
  cardData: SampleValidatedProblemCardData;
  rankPosition: number;
}) {
  const scoreColorClass =
    cardData.opportunityGapScore >= 80
      ? "text-signal"
      : cardData.opportunityGapScore >= 60
        ? "text-amber-400"
        : "text-red-400";

  return (
    <Card className="bg-card border-border h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold shrink-0">
              {rankPosition}
            </span>
            <CardTitle className="text-sm leading-snug">
              {cardData.problemTitle}
            </CardTitle>
          </div>
          <Badge
            variant="outline"
            className="shrink-0 text-[10px] border-border"
          >
            <span className={`font-bold ${scoreColorClass}`}>
              {cardData.opportunityGapScore}
            </span>
            <span className="text-muted-foreground">/100</span>
          </Badge>
        </div>

        {/* Score bar */}
        <div className="w-full h-1 bg-secondary rounded-full mt-2 overflow-hidden">
          <div
            className="h-full bg-linear-to-r from-brand to-signal rounded-full transition-all"
            style={{ width: `${cardData.opportunityGapScore}%` }}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        <p className="text-xs text-muted-foreground leading-relaxed">
          {cardData.problemDescription}
        </p>

        <div className="flex gap-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <BsPeople className="w-3.5 h-3.5" />
            <span>
              <strong className="text-foreground">
                {cardData.evidencePostCount}
              </strong>{" "}
              posts
            </span>
          </div>
          <div className="flex items-center gap-1">
            <AiOutlineDollar className="w-3.5 h-3.5" />
            <span>
              Market:{" "}
              <strong className="text-foreground">
                {cardData.estimatedMarketSizeDisplay}
              </strong>
            </span>
          </div>
        </div>

        <Separator className="opacity-30" />

        <div className="flex items-start gap-2">
          <BsLightbulb className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
          <p className="text-xs text-muted-foreground">
            <strong className="text-foreground">MVP idea: </strong>
            {cardData.topMinimumViableProductIdea}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ── CTA feature checklist items ──────────────────────────────── */

const CTA_FEATURE_CHECKLIST_ITEMS: string[] = [
  "No credit card required",
  "First report is free",
  "Export to PDF instantly",
  "Real Reddit & web data",
];

/* ── Main section ─────────────────────────────────────────────── */

export function LandingCallToActionSection() {
  return (
    <>
      {/* Sample output cards section */}
      <section className="py-24 px-6">
        <div className="max-w-6xl mx-auto">

          <div className="text-center mb-12">
            <p className="text-sm font-semibold text-brand-light uppercase tracking-widest mb-3">
              Sample output
            </p>
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Real problems. Real opportunities.
            </h2>
            <p className="text-lg text-muted-foreground max-w-xl mx-auto">
              Here is what a validated problem card looks like in your report.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-5">
            {SAMPLE_VALIDATED_PROBLEM_CARDS_DATA.map(
              (sampleCardData, cardIndex) => (
                <SampleValidatedProblemCard
                  key={sampleCardData.problemTitle}
                  cardData={sampleCardData}
                  rankPosition={cardIndex + 1}
                />
              )
            )}
          </div>
        </div>
      </section>

      {/* CTA section */}
      <section className="py-24 px-6">
        <div className="max-w-3xl mx-auto">
          <div
            className="relative rounded-2xl border border-primary/25 overflow-hidden p-10 text-center"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, oklch(0.75 0.12 270 / 0.15), transparent 70%), oklch(0.97 0.004 270)",
            }}
          >
            {/* Glow line at top */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-2/3 h-px"
              style={{
                background:
                  "linear-gradient(90deg, transparent, oklch(0.58 0.26 270 / 0.6), transparent)",
              }}
            />

            <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/15 border border-primary/30 mb-6">
              <TbRadar2 className="w-6 h-6 text-primary" />
            </div>

            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
              Start your first research free
            </h2>

            <p className="text-muted-foreground text-lg mb-2 max-w-xl mx-auto">
              What a product manager takes{" "}
              <span className="text-foreground font-semibold">3 weeks</span> to
              research, FluxIdeas does in{" "}
              <span className="text-foreground font-semibold">3 minutes</span>{" "}
              for{" "}
              <span className="text-signal font-semibold">$0.08</span>.
            </p>

            <p className="text-muted-foreground/60 text-sm mb-8">
              Backed by real Reddit data. Validated by Claude AI. Ready in
              minutes.
            </p>

            <div className="flex items-center justify-center mb-8">
              <Button
                asChild
                size="lg"
                className="h-12 px-8 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-bold gap-2 text-base shadow-md transition-all"
              >
                <Link to="/signup">
                  Get Started for Free
                  <BsArrowRight className="w-4 h-4" />
                </Link>
              </Button>
            </div>

            {/* Feature checklist */}
            <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {CTA_FEATURE_CHECKLIST_ITEMS.map((checklistItem) => (
                <div
                  key={checklistItem}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground"
                >
                  <BsCheckCircle className="w-3.5 h-3.5 text-signal" />
                  {checklistItem}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

    </>
  );
}
