import { Link } from "react-router";
import { TbRadar2 } from "react-icons/tb";
import { BsGithub, BsTwitterX } from "react-icons/bs";

const FOOTER_NAV_LINKS: Array<{ label: string; to: string }> = [
  { label: "Privacy", to: "/privacy" },
  { label: "Terms",   to: "/terms"   },
];

export function ApplicationPublicFooter() {
  return (
    <footer className="border-t border-border/40 bg-background">
      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">

          {/* Brand */}
          <Link to="/" className="flex items-center gap-2 group">
            <TbRadar2 className="w-4 h-4 text-primary/60 group-hover:text-primary transition-colors" />
            <span className="text-sm font-semibold text-muted-foreground/70 group-hover:text-muted-foreground transition-colors">
              FluxIdeas
            </span>
          </Link>

          {/* Nav links */}
          <div className="flex items-center gap-5 text-sm text-muted-foreground/50">
            {FOOTER_NAV_LINKS.map((navLink) => (
              <Link
                key={navLink.label}
                to={navLink.to}
                className="hover:text-muted-foreground transition-colors"
              >
                {navLink.label}
              </Link>
            ))}
            <span className="hidden sm:inline text-muted-foreground/30">·</span>
            <span className="hidden sm:inline">Built for HEC GenAI Hackathon · 2026</span>
          </div>

          {/* Social icons */}
          <div className="flex items-center gap-3 text-muted-foreground/40">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-muted-foreground transition-colors"
              aria-label="GitHub"
            >
              <BsGithub className="w-4 h-4" />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-muted-foreground transition-colors"
              aria-label="X (Twitter)"
            >
              <BsTwitterX className="w-4 h-4" />
            </a>
          </div>

        </div>
      </div>
    </footer>
  );
}
