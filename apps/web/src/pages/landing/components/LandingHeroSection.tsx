import type { IconType } from "react-icons";
import { Link } from "react-router";
import { Button } from "@/shared/ui/button";
import { BsArrowRight, BsReddit } from "react-icons/bs";
import { SiProducthunt } from "react-icons/si";
import { TbTrendingUp, TbWorld } from "react-icons/tb";

/* ── Mini product preview card shown in the hero ─────────────── */

const HERO_PREVIEW_FEED_LOG_LINES: Array<{
  stageColorClass: string;
  messageText: string;
}> = [
  { stageColorClass: "text-blue-400",   messageText: "🔍  Scraping Reddit r/entrepreneur..." },
  { stageColorClass: "text-blue-400",   messageText: "🔍  247 posts collected" },
  { stageColorClass: "text-purple-400", messageText: "🧠  Claude clustering patterns..." },
  { stageColorClass: "text-purple-400", messageText: "🧠  12 distinct problems found" },
  { stageColorClass: "text-green-400",  messageText: "✅  Validating top problems..." },
  { stageColorClass: "text-amber-400",  messageText: "📊  Generating PDF report..." },
  { stageColorClass: "text-green-400",  messageText: "✅  Done — 5 problems validated" },
];

function HeroProductPreviewCard() {
  return (
    <div className="relative">
      <div
        className="absolute -inset-4 rounded-3xl opacity-40 blur-3xl pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, oklch(0.75 0.14 270), transparent 70%)",
        }}
      />

      <div className="relative rounded-2xl border border-zinc-200 shadow-2xl overflow-hidden bg-white">

        <div className="flex items-center gap-3 px-4 py-2.5 bg-zinc-100 border-b border-zinc-200">
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-amber-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          <div className="flex-1 bg-white rounded-md border border-zinc-200 px-3 py-1 flex items-center">
            <span className="text-[11px] text-zinc-400">
              app.FluxIdeas.com/research/remote-work-tools
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2">

          {/* Left — live agent feed */}
          <div className="bg-zinc-950 p-4 min-h-[280px]">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
              <span className="text-[11px] text-zinc-400 font-mono">
                Agent Pipeline · Live
              </span>
            </div>
            <div className="space-y-1.5">
              {HERO_PREVIEW_FEED_LOG_LINES.map((logLine, lineIndex) => (
                <div
                  key={lineIndex}
                  className="flex items-start gap-1.5 font-mono text-[11px]"
                >
                  <span className="text-zinc-600 shrink-0">{">"}</span>
                  <span className={logLine.stageColorClass}>
                    {logLine.messageText}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — top results */}
          <div className="p-4 bg-white border-l border-zinc-100">
            <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-3">
              Top validated problems
            </p>

            <div className="rounded-lg border border-violet-200 bg-violet-50 p-2.5 mb-2">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <span className="text-[11px] font-bold text-zinc-900 leading-snug">
                  No async standup tool that gets adopted
                </span>
                <span className="text-[11px] font-extrabold text-violet-600 shrink-0">
                  87
                </span>
              </div>
              <div className="w-full h-1 bg-violet-200 rounded-full mb-2">
                <div className="h-full w-[87%] bg-violet-500 rounded-full" />
              </div>
              <div className="flex gap-2 text-[10px] text-zinc-500">
                <span>156 posts</span>
                <span>·</span>
                <span>~$840M market</span>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 p-2.5 opacity-70">
              <div className="flex items-start justify-between gap-2 mb-1">
                <span className="text-[11px] font-semibold text-zinc-700 leading-snug">
                  Video call fatigue — no fix
                </span>
                <span className="text-[11px] font-bold text-zinc-500 shrink-0">
                  74
                </span>
              </div>
              <div className="flex gap-2 text-[10px] text-zinc-400">
                <span>89 posts</span>
                <span>·</span>
                <span>~$1.2B market</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between px-4 py-2.5 bg-violet-600 text-white">
          <span className="text-xs font-medium">
            ✅ Report ready — completed in 4m 37s
          </span>
          <span className="text-xs font-semibold flex items-center gap-1 cursor-pointer hover:underline">
            Download PDF <BsArrowRight className="w-3 h-3" />
          </span>
        </div>
      </div>
    </div>
  );
}

/* ── Data source trust badges ─────────────────────────────────── */

const DATA_SOURCE_TRUST_ITEMS: Array<{
  icon: IconType;
  label: string;
  colorClass: string;
}> = [
  { icon: BsReddit,       label: "Reddit",        colorClass: "text-orange-500" },
  { icon: SiProducthunt,  label: "Product Hunt",  colorClass: "text-orange-400" },
  { icon: TbTrendingUp,   label: "Google Trends", colorClass: "text-blue-500"   },
  { icon: TbWorld,        label: "Open Web",      colorClass: "text-green-600"  },
];

/* ── Hero section ─────────────────────────────────────────────── */

export function LandingHeroSection() {
  return (
    <section className="min-h-screen flex items-center pt-16 px-6 overflow-hidden">
      <div className="max-w-6xl mx-auto w-full grid lg:grid-cols-[1fr_1.1fr] gap-16 items-center py-20">

        {/* Left — text content */}
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-violet-200 bg-violet-50 text-violet-700 text-sm font-medium mb-7">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-radar-ring absolute inset-0 rounded-full bg-violet-400/60" />
              <span className="relative h-2 w-2 rounded-full bg-violet-500" />
            </span>
            Powered by Claude AI
          </div>

          <h1 className="text-5xl md:text-[3.75rem] font-extrabold leading-[1.08] tracking-tight text-zinc-900 mb-5">
            Stop guessing
            <br />
            <span className="text-violet-600">what to build.</span>
          </h1>

          <p className="text-lg text-zinc-500 leading-relaxed mb-8 max-w-[440px]">
            FluxIdeas mines Reddit, Product Hunt, and Google Trends to discover
            real validated problems — and turns them into a market research
            report in under{" "}
            <span className="text-zinc-900 font-semibold">5 minutes</span>.
          </p>

          <div className="flex flex-wrap gap-3 mb-10">
            <Button
              asChild
              size="lg"
              className="h-12 px-7 rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold gap-2 text-base shadow-md transition-all"
            >
              <Link to="/signup">
                Start for Free
                <BsArrowRight className="w-4 h-4" />
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="h-12 px-7 rounded-full text-zinc-800 border-zinc-300 hover:bg-zinc-100 hover:border-zinc-400 font-semibold text-base transition-all"
            >
              <Link to="/login">Sign In</Link>
            </Button>
          </div>

          <div>
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">
              Mines real data from
            </p>
            <div className="flex flex-wrap gap-4">
              {DATA_SOURCE_TRUST_ITEMS.map((dataSourceItem) => {
                const DataSourceIconComponent = dataSourceItem.icon;
                return (
                  <div
                    key={dataSourceItem.label}
                    className="flex items-center gap-1.5 text-sm text-zinc-500"
                  >
                    <DataSourceIconComponent
                      className={`w-4 h-4 ${dataSourceItem.colorClass}`}
                    />
                    {dataSourceItem.label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right — product preview mockup */}
        <HeroProductPreviewCard />

      </div>
    </section>
  );
}
