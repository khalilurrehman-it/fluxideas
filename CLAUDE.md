# CLAUDE.md — FluxIdeas

## Project Identity

**Name:** FluxIdeas
**Tagline:** Stop guessing what to build. Let AI find what the market is screaming for.
**Type:** Agentic AI SaaS — Multi-Agent Market Research Engine

---

## What We Are Building

FluxIdeas is a multi-agent AI system that autonomously mines Reddit, Product Hunt,
Google Trends, and the broader web to discover real, validated problems that people
are actively complaining about — and turns them into a structured, investor-grade
market research report in under 5 minutes.

**The core user journey:**
1. User enters a domain or industry (e.g. "remote work tools")
2. Agent 1 scrapes Reddit, Product Hunt, Google Trends, and Tavily web search
3. Agent 2 clusters raw complaints into distinct problem patterns using Claude AI
4. Agent 3 validates each problem — checks existing solutions, estimates market
   size, assigns an opportunity gap score
5. Agent 4 generates a professional PDF report with top 5 validated problems,
   competitor landscape, MVP suggestions, and opportunity scores
6. User downloads the report or views it in the dashboard

**The live agent feed (the WOW factor):**
While the agents run, the frontend shows a real-time log streamed via WebSocket:
  🔍 Scraping Reddit r/entrepreneur... (247 posts found)
  🔍 Scanning Product Hunt discussions... (94 posts found)
  🧠 Claude clustering patterns... (12 problem clusters found)
  ✅ Validating: "No good invoicing tool for freelancers"
  📊 Generating your report...
  ✅ Done.

This live feed is the primary demo moment. It must always work and look impressive.

---

## Golden Rule — Plan First, Execute Second

**Before writing ANY code, Claude must:**

1. State out loud what the task is and what files are affected
2. Write a step-by-step plan of what will be changed and why
3. Get confirmation (or proceed if context is obvious)
4. Execute the plan — no surprises, no scope creep

**Never:**
- Jump straight into writing code without a plan
- Change files that were not mentioned in the plan
- Refactor or "improve" things that were not asked about
- Add features nobody requested

---

## Actual Repository Structure (apps/web)

The frontend lives at `apps/web/src/`. The CLAUDE.md folder layout below reflects
the real structure on disk — not the original spec.

```
apps/web/src/
├── App.tsx                          # Root — BrowserRouter + AuthProvider + Toaster
├── main.tsx                         # React DOM entry point
├── index.css                        # Tailwind v4 @theme + shadcn CSS vars
│
├── pages/
│   ├── landing/
│   │   ├── LandingPage.tsx          # export default function LandingPage()
│   │   └── components/
│   │       ├── LandingHeroSection.tsx
│   │       ├── LandingAgentPipelineFeaturesSection.tsx
│   │       └── LandingCallToActionSection.tsx
│   ├── auth/
│   │   ├── UserLoginPage.tsx        # export default — react-hook-form + zod
│   │   └── UserSignupPage.tsx       # export default — strength meter + zod
│   ├── dashboard/
│   │   ├── UserDashboardOverviewPage.tsx
│   │   └── NewResearchPage.tsx          # Live feed + problem selection
│   ├── errors/
│   │   └── NotFoundPage.tsx
│   └── report/
│       └── (planned)
│
├── layouts/
│   ├── ApplicationRootLayout.tsx    # Top nav + footer — public routes
│   ├── ApplicationPublicFooter.tsx
│   ├── DashboardSidebarLayout.tsx   # Fixed sidebar + mobile drawer
│   └── navigation/
│       ├── ApplicationTopNavBar.tsx
│       └── DashboardSidebarNavigation.tsx  # Uses useAuth for sign-out
│
├── lib/
│   ├── auth.context.tsx             # AuthProvider + useAuth hook
│   └── utils.ts
│
├── shared/
│   ├── ui/
│   │   ├── button.tsx               # shadcn
│   │   ├── input.tsx                # shadcn
│   │   ├── card.tsx                 # shadcn
│   │   ├── badge.tsx                # shadcn
│   │   ├── separator.tsx            # shadcn
│   │   └── sonner.tsx               # Toaster wrapper (sonner)
│   ├── components/
│   │   └── ProtectedRoute.tsx       # Redirects unauthenticated → /login
│   ├── hooks/
│   ├── constants/
│   ├── utils/
│   ├── market-research/
│   ├── report-generation/
│   └── user-authentication/
│
├── providers/
│   └── ApplicationQueryClientProvider.tsx
│
├── store/
│   ├── application.store.ts
│   └── root.reducer.ts
│
└── router/
```

### Agent pipeline (`apps/agents/`)

```
apps/agents/
├── main.py                          # FastAPI entrypoint
├── requirements.txt
├── .env.example
└── orchestrator/
    ├── graph.py                     # LangGraph state machine definition
    ├── state.py                     # PipelineState TypedDict
    ├── agents/
    │   ├── scout.py                 # HackerNews scraper (zero API key)
    │   ├── researcher.py            # DuckDuckGo + Reddit PRAW
    │   ├── reasoner.py              # Claude Haiku — problem clustering
    │   ├── analyst.py               # Claude Sonnet — deep analysis
    │   ├── strategist.py            # Claude Sonnet — MVP strategy
    │   ├── economist.py             # DDGS + Claude Haiku — TAM/SAM/SOM
    │   ├── designer.py              # Pollinations.ai — UI mockup
    │   ├── critic.py                # Claude Haiku — risk audit
    │   └── reporter.py              # ReportLab PDF + python-pptx PPTX
    └── routers/
        ├── phase1.py                # POST /run-pipeline/phase1
        └── phase2.py                # POST /run-pipeline/phase2
```

---

## Tech Stack — Frontend (actual installed packages)

| Technology         | Version   | Purpose                              |
|--------------------|-----------|--------------------------------------|
| React              | 19.x      | UI framework                         |
| Vite               | 6.x       | Build tool                           |
| TypeScript         | 5.x       | Strict type safety                   |
| Tailwind CSS       | 4.x       | Utility-first styling (`@theme`)     |
| shadcn/ui          | New York  | Pre-built components (`@/shared/ui`) |
| React Router       | 7.x       | Client-side routing                  |
| react-hook-form    | Latest    | Form state management                |
| zod                | Latest    | Schema validation (frontend + forms) |
| @hookform/resolvers| Latest    | Bridges zod with react-hook-form     |
| sonner             | Latest    | Toast notifications                  |
| react-icons        | 5.x       | Icon library (Tb, Bs, Ai, Si sets)   |

---

## Tech Stack — Backend (Node.js)

| Technology         | Version   | Purpose                              |
|--------------------|-----------|--------------------------------------|
| Node.js            | 22.x LTS  | Runtime                              |
| Express            | 5.x       | HTTP server and routing              |
| TypeScript         | 5.x       | Type safety                          |
| Better Auth        | Latest    | Auth — sessions, JWT, OAuth          |
| Drizzle ORM        | 0.40.x    | Type-safe PostgreSQL queries         |
| ws                 | 8.x       | WebSocket server                     |
| express-rate-limit | Latest    | Rate limiting                        |
| helmet             | Latest    | Security headers                     |
| cors               | Latest    | CORS configuration                   |
| dotenv             | Latest    | Environment variable loading         |
| zod                | 3.x       | Request body validation              |

---

## Tech Stack — Agent Pipeline (Python)

| Technology        | Version   | Purpose                              |
|-------------------|-----------|--------------------------------------|
| Python            | 3.12.x    | Runtime                              |
| FastAPI           | 0.115.x   | Agent HTTP server                    |
| Uvicorn           | 0.32.x    | ASGI server                          |
| Anthropic SDK     | Latest    | Claude API integration               |
| LangGraph         | Latest    | Multi-agent orchestration            |
| duckduckgo-search | Latest    | Web search (zero API key)            |
| requests          | Latest    | HackerNews API (zero API key)        |
| PRAW              | 7.x       | Reddit API (optional)                |
| Tavily            | Latest    | Web search API (optional)            |
| BeautifulSoup4    | 4.x       | HTML scraping                        |
| ReportLab         | 4.x       | PDF report generation                |
| python-pptx       | Latest    | PPTX pitch deck export               |
| Cloudinary SDK    | Latest    | PDF upload to cloud storage (optional)|
| Pydantic          | 2.x       | Data validation and schemas          |
| httpx             | Latest    | Async HTTP client                    |
| python-dotenv     | Latest    | Environment variable loading         |

---

## Frontend Code Style Rules — Non-Negotiable

### Component structure
```tsx
// ✅ Correct — simple, no React namespace, no explicit return type
export default function UserLoginPage() {
  return <div>...</div>;
}

// ✅ Correct — named export for non-page components
export function DashboardSidebarNavigation() {
  return <aside>...</aside>;
}

// ✅ Correct — internal sub-components (no export)
function SidebarNavLink({ navItem }: { navItem: NavItem }) {
  return <a>...</a>;
}

// ✅ Correct — children prop
function ProtectedRoute({ children }: PropsWithChildren) {
  return <>{children}</>;
}

// ❌ Wrong — old verbose style
export function BadPage(): React.JSX.Element { ... }
import React from "react";
{ children }: { children: React.ReactNode }
```

### Imports
- Do NOT write `import React from "react"` — the JSX transform handles it automatically
- Import only specific hooks/types needed: `import { useState, useCallback } from "react"`
- For children type: `import { PropsWithChildren } from "react"`
- No explicit return type annotations on components

### Exports
- **Pages** (`src/pages/**`): `export default function`
- **Layouts and shared components** (`src/layouts/**`, `src/shared/**`): `export function`
- **Internal sub-components** (inside a file, not exported): plain `function`
- No default exports anywhere except page files

### Validation
- All forms use **react-hook-form** + **zod** via `zodResolver`
- All zod schemas defined at the top of the file, not inline
- `noValidate` on every `<form>` element (zod handles it)
- Use `formState.errors` to show inline validation messages below each field
- Apply `border-destructive` on inputs when they have an error
- Login form: validate email format + non-empty password
- Signup form: full strong-password rules (min 8 chars, uppercase, lowercase, number, special char)

### Password strength (signup only)
- 5-step strength bar using Tailwind color classes
- Rule checklist visible while typing (check/X icons per rule)
- Strength levels: Weak → Fair → Good → Strong → Very strong
- Colors: red → amber → amber → green → dark green

### Toasts (sonner)
- Import: `import { toast } from "sonner"`
- Validation errors in forms → `toast.error("…")`
- Successful actions → `toast.success("…")`
- Auth errors (API failures) → `toast.error("…")`
- Sign-out → `toast.success("You've been signed out.")`
- `<Toaster>` mounted once in `App.tsx` with `position="top-right" richColors closeButton`

### Tailwind v4 syntax
- Gradients: `bg-linear-to-r` (NOT `bg-gradient-to-r`)
- CSS variables: defined in `@theme {}` block in `index.css`
- Shadcn CSS vars: defined in `@layer base { :root {} }` in `index.css`

---

## Design System

### Brand colors (CSS vars in `index.css`)
- `--primary`: `oklch(0.60 0.27 263)` — vibrant violet-indigo (used by shadcn components)
- `--color-brand`: same as primary
- `--color-brand-light`: slightly darker for text on white
- `--color-signal`: green accent (`oklch(0.52 0.18 145)`)
- Background: near-white (`oklch(0.99 0 0)`)

### Button styles used in the project
- **Primary CTA**: `className="... rounded-full bg-zinc-900 hover:bg-zinc-800 text-white font-semibold gap-2"`
- **Outline / secondary**: `variant="outline"` with custom classes
- **Ghost**: `variant="ghost"` for nav and icon buttons
- All main CTA buttons are **black pill-shaped** (`rounded-full bg-zinc-900`)

### Auth page layout pattern
Both `/login` and `/signup` use a **split-panel layout**:
- Left 52% (hidden on mobile): dark branded panel (`oklch(0.10 0.02 270)` + violet radial glow), logo, headline, feature list / stats, testimonial
- Right 48%: white form panel, centered, max-width 380px
- Mobile: left panel hidden, logo appears above form

### Sidebar
- Width: `w-56` (fixed on desktop, drawer on mobile)
- Background: `bg-zinc-50`
- Active nav item: `bg-primary/10 text-primary`
- Sign-out button: hover red (`hover:bg-red-50 hover:text-red-600`)
- Shows user name + email initial avatar when authenticated

---

## Auth Architecture (Frontend — mock, to be replaced with Better Auth)

**Current implementation** (`src/lib/auth.context.tsx`):
- `AuthProvider` wraps the entire app
- `useAuth()` hook provides: `user`, `isAuthenticated`, `login()`, `signup()`, `logout()`
- Auth state persisted in `localStorage` under key `FluxIdeas_auth_user`
- `login()` and `signup()` simulate 800-900ms async delay (will be replaced with real API calls)
- `logout()` clears localStorage and redirects to `/login` via `useNavigate`

**Route protection** (`src/shared/components/ProtectedRoute.tsx`):
- Wraps any route that requires authentication
- Unauthenticated users are redirected to `/login` with `state={{ from: location }}`
- After login, users are redirected back to their original destination

**Currently protected routes:**
- `/dashboard` and all its children

**Public routes (no auth required):**
- `/` (landing)
- `/login`
- `/signup`

**TODO — replace mock auth with Better Auth:**
- Wire `login()` to `POST /api/auth/signin`
- Wire `signup()` to `POST /api/auth/signup`
- Wire `logout()` to `POST /api/auth/signout`
- Replace localStorage persistence with Better Auth session cookie

---

## What Is Built (Frontend)

- [x] Landing page — hero, agent pipeline section, CTA + sample problem cards
- [x] Top navigation bar (public) — Sign In + Get Started CTAs
- [x] Public footer
- [x] Login page — react-hook-form + zod, split-panel layout, show/hide password
- [x] Signup page — react-hook-form + zod, strong password rules + strength meter
- [x] Route protection — unauthenticated users redirected to /login
- [x] Dashboard overview page — stat cards, recent reports table, new research input
- [x] Dashboard sidebar layout — fixed desktop, mobile drawer
- [x] Sign-out button — clears auth, redirects, shows toast
- [x] Toast notifications (sonner) — success/error across auth flows
- [x] New Research page with live agent feed + problem selection UI
- [x] Login error messages (email not registered vs wrong password)

## What Is Built (Backend + Agents)

- [x] Node.js Express backend (helmet, cors, rate limiting)
- [x] Better Auth integration (real cookie-based auth)
- [x] Drizzle ORM schema + migrations
- [x] WebSocket server for agent log streaming
- [x] LangGraph orchestrator — 9-agent pipeline (Scout/HN, Researcher/DDGS, Reasoner, Analyst, Strategist, Economist, Designer, Critic, Reporter)
- [x] Phase 1 / Phase 2 pipeline split with human problem selection
- [x] HackerNews + DuckDuckGo scrapers (zero API key dependency)
- [x] Claude AI analysis (clustering, analyst, strategist, economist, critic)
- [x] PPTX pitch deck export
- [x] AI UI mockup via Pollinations.ai (free)
- [x] TAM/SAM/SOM economist analysis
- [x] Red-team critic risk audit
- [x] PDF report generation (ReportLab)

## What Is NOT Built Yet (Frontend)

- [ ] My Reports page (`/dashboard/reports`) — list of past reports
- [ ] Report viewer page (`/dashboard/reports/:id`) — single report detail
- [ ] Settings page (`/dashboard/settings`)

## What Is NOT Built Yet (Backend + Agents)

- [ ] Cloudinary upload (optional — currently returns PDF inline)
- [ ] End-to-end testing of full pipeline on Railway

---

## Database Schema (Drizzle ORM)

```typescript
// backend/src/db/schema.ts

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: varchar("email", { length: 255 }).unique().notNull(),
  name: varchar("name", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

export const searches = pgTable("searches", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  topic: varchar("topic", { length: 500 }).notNull(),
  status: varchar("status", { length: 50 }).default("pending"),
  // status: pending | scraping | clustering | validating | generating | done | failed
  createdAt: timestamp("created_at").defaultNow(),
});

export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(),
  searchId: uuid("search_id").references(() => searches.id).notNull(),
  userId: uuid("user_id").references(() => users.id).notNull(),
  pdfUrl: varchar("pdf_url", { length: 1000 }),
  topProblems: jsonb("top_problems"),
  createdAt: timestamp("created_at").defaultNow(),
});
```

---

## Environment Variables

### CRITICAL SECURITY RULE
> **ALL secrets live on the backend. ZERO secrets on the frontend.**
> The frontend only knows one thing: the backend URL.
> If a key is not `VITE_API_URL`, it does NOT belong in the frontend `.env`.

### Frontend `.env`
```bash
VITE_API_URL=https://your-backend.railway.app
```

### Backend `.env`
```bash
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://your-app.vercel.app
DATABASE_URL=postgresql://user:password@host:5432/FluxIdeas
BETTER_AUTH_SECRET=your-32-char-random-secret-here
BETTER_AUTH_URL=https://your-backend.railway.app
AGENT_SERVICE_URL=https://your-agents.railway.app
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

### Python Agents `.env`
```bash
ANTHROPIC_API_KEY=
REDDIT_CLIENT_ID=
REDDIT_CLIENT_SECRET=
REDDIT_USER_AGENT=FluxIdeas/1.0
TAVILY_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
INTERNAL_API_KEY=your-internal-secret-between-node-and-python
```

---

## API Contracts

### Node.js Backend → Frontend

```
POST   /api/research          Start a new research job
GET    /api/reports           Get all reports for current user
GET    /api/reports/:id       Get single report
DELETE /api/reports/:id       Delete a report
GET    /api/auth/session      Get current session

WS     /ws/research/:searchId Stream live agent logs to frontend
```

### FastAPI (Agents) → Node.js Backend (internal only)

```
POST   /run-agents            Start the full 4-agent pipeline
GET    /health                Health check
```

FastAPI is NOT exposed to the public internet.
It only accepts requests from Node.js via `INTERNAL_API_KEY` header validation.

---

## Security Rules — Non-Negotiable

### Authentication
- Every API route in Node.js (except `/api/auth/*` and `/health`) must pass
  through `authMiddleware.ts` — no exceptions
- Sessions managed by Better Auth — never roll custom JWT logic
- Passwords hashed by Better Auth — never store plaintext

### API Security
- All Node.js routes protected with `helmet()` — sets secure HTTP headers
- CORS locked to `FRONTEND_URL` only — no wildcard origins ever
- Rate limiting on all routes — especially `/api/research` (max 5/hour per user)
- All request bodies validated with `zod` before touching any logic
- FastAPI only accepts requests with a valid `X-Internal-Key` header

### Frontend Validation (zod schemas — must match backend)
- Email: valid format, max 255 chars
- Password: min 8, uppercase, lowercase, number, special char
- Name: 2–100 chars, letters/spaces/hyphens/apostrophes only
- Topic: min 3 chars, max 500

### Database
- Drizzle ORM prevents raw SQL injection by design
- Never use `db.execute(rawSql)` with user-provided strings

---

## Agent Pipeline Rules

Each agent must:
1. Log its start and end to the WebSocket stream so the user sees progress
2. Handle errors gracefully — return a partial result rather than crashing
3. Never exceed 60 seconds per agent — set timeouts on all external calls
4. Return structured Pydantic models — never untyped dicts between agents

---

## WebSocket Protocol

```typescript
interface AgentLog {
  type: "log" | "complete" | "error";
  stage: "scraping" | "clustering" | "validating" | "generating" | "done";
  message: string;
  timestamp: string;
  data?: unknown;
}
```

---

## What This Project Is NOT

- Not a chatbot
- Not a note-taking app
- Not a competitor tracker
- Not a social platform

If a feature request falls outside **Search → Scrape → Cluster → Validate → Report**, question it hard.

---

## The Demo Script (Hackathon)

1. Open the app — clean landing page with a single search bar
2. Type: "productivity tools for remote teams"
3. Press enter — live agent feed starts streaming immediately
4. Audience watches real Reddit posts being found, clustered, validated
5. After ~3 minutes — "Report ready" appears
6. Click to open — professional PDF with 5 validated problems, market sizes,
   competitor gaps, and MVP suggestions
7. Deliver line: "What just happened would take a product manager 3 weeks.
   We did it in 3 minutes for $0.08."

The demo must work every single time. Reliability > features.

---

*Last updated: May 2026 | FluxIdeas — HEC GenAI Hackathon*

---

## Local Dev Commands

### Web + Server (run from repo root)
```bash
pnpm dev
```

### Agent Pipeline (run from `apps/agents/`)
```bash
# Activate venv first if using one
source .venv/bin/activate          # Linux/macOS
# .venv\Scripts\activate           # Windows

uvicorn main:app --reload --port 8000
```

---

## Development Status

### Completed ✅
- [x] Landing page with hero, features, CTA sections
- [x] Login/signup pages with react-hook-form + zod
- [x] Better Auth integration (real cookie-based auth)
- [x] Dashboard overview page + sidebar layout
- [x] Node.js Express backend (helmet, cors, rate limiting)
- [x] Drizzle ORM schema + migrations
- [x] WebSocket server for agent log streaming (path option removed — accepts /ws/research/:id)
- [x] LangGraph orchestrator with 9 agents (Scout/HN, Researcher/DDGS, Reasoner, Analyst, Strategist, Economist, Designer, Critic, Reporter)
- [x] Fully automatic pipeline — no human selection step. Auto-selects top-ranked problem after Phase 1 and runs Phase 2 immediately
- [x] All results saved to DB (reports table — topValidatedProblems JSONB includes source_refs)
- [x] PPTX pitch deck export + AI UI mockup (Pollinations.ai)
- [x] Railway deployment configs for all 3 services
- [x] Login error messages (email not registered vs wrong password)
- [x] Friend's RidarAI code integrated into `apps/agents/radarai_reference/`
- [x] `duckduckgo-search` → renamed to `ddgs` package
- [x] My Reports page (`/dashboard/reports`) — list of past runs with delete
- [x] Report detail page (`/dashboard/reports/:id`) — full dossier view
- [x] **Infinite loop bug fixed** — `orchestrator_node` no longer re-routes to reporter after first attempt (uses `reporter_attempted` flag in state)
- [x] **Cloudinary fallback fixed** — `report_agent_runner.py` wraps upload in try/except; on failure pdf_url is None but dossier data still streams to frontend (all tabs visible, PDF download button hidden)
- [x] **`pptx_url` added to `Phase2PipelineResponse`** — PPTX deck download now reachable from frontend

### In Progress 🔄
- [ ] End-to-end pipeline test on Railway URLs
- [ ] DDGS rate limiting — add exponential backoff in production

### Known Issues / Tech Debt
- [x] **In-memory session store** — eliminated. `search_job_id` is now the LangGraph `thread_id` directly.
- [x] **Infinite reporter loop** — fixed with `reporter_attempted` state flag.
- [ ] LangGraph `MemorySaver` loses state on restart — upgrade to `langgraph-checkpoint-postgres` post-hackathon
- [ ] Reddit PRAW 401 — no credentials configured. Pipeline falls back to HN + DDGS.

### Deployment Checklist
- [x] Run `pnpm db:migrate` on Railway
- [x] Code fixes pushed (infinite loop, Cloudinary fallback, pptx_url in response)
- [ ] **Set Railway env vars for all 3 services** — see critical list below
- [ ] Test full pipeline end-to-end on Railway URLs
- [ ] Verify WebSocket live feed works across Railway services

### Railway Env Vars — Must Set Before Demo

**Agents service:**
| Variable | Value |
|---|---|
| `NODEJS_BACKEND_LOG_ENDPOINT_URL` | `https://YOUR-SERVER.railway.app/internal/pipeline-log` |
| `ANTHROPIC_API_KEY` | *(already in .env — copy to Railway)* |
| `CLOUDINARY_CLOUD_NAME` | `fluxideas` |
| `CLOUDINARY_API_KEY` | *(from .env)* |
| `CLOUDINARY_API_SECRET` | *(from .env)* |
| `INTERNAL_API_KEY` | *(must match server)* |

**Server service:**
| Variable | Value |
|---|---|
| `AGENT_SERVICE_URL` | `https://YOUR-AGENTS.railway.app` |
| `BETTER_AUTH_URL` | `https://YOUR-SERVER.railway.app` ← used to build log callback URL |
| `FRONTEND_URL` | `https://YOUR-FRONTEND.railway.app` ← CORS |
| `DATABASE_URL` | *(Railway Postgres — already set)* |
| `BETTER_AUTH_SECRET` | *(from .env)* |
| `INTERNAL_API_KEY` | *(must match agents)* |

**Frontend (Vercel / Railway):**
| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://YOUR-SERVER.railway.app` |

---

## Lessons Learned

### Monorepo Layout
- pnpm workspaces + Turborepo: each app (`web`, `server`, `agents`) isolated under `apps/`, shared code in `packages/`.
- All file names: kebab-case with type suffix (`market-research.service.ts`). React components: PascalCase (`UserResearchPage.tsx`).

### Server Architecture
- Module-based: each domain gets `.controller`, `.service`, `.repository`, `.routes`, `.validation`.
- Controller = HTTP only. Service = business logic. Repository = DB queries. Never mix.

### Key Technical Decisions
- **Better Auth** mounted with `app.all("/api/auth/*splat", toNodeHandler(...))` — NOT `app.use` (path stripping bug).
- **pnpm on Windows**: `node-linker=hoisted` in `.npmrc` fixes dynamic `import()` failures with drizzle-kit.
- **Zod v4**: uses `error.issues` not `error.format()`.
- **ALL secrets** live in `apps/server/.env` — frontend only knows `VITE_API_URL`.
- **LangGraph + Ollama → Claude**: Ollama is undeployable on Railway (no GPU). All LLM nodes use Anthropic Claude API.
- **Session store**: Use `search_job_id` as LangGraph `thread_id` — eliminates in-memory state entirely.

### Dependency Notes
- `langchain-anthropic` NOT used — direct Anthropic SDK (`anthropic.AsyncAnthropic`) for all Claude calls.
- `duckduckgo-search` was renamed to `ddgs` — use `from ddgs import DDGS`. Still sync-only, wrap in `asyncio.get_event_loop().run_in_executor(None, ...)`.
- Tailwind v4: `bg-linear-to-r` not `bg-gradient-to-r`. Config in CSS `@theme {}` block, no `tailwind.config.ts`.
