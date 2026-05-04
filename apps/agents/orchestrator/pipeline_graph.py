import asyncio
import json
import os
import re
import urllib.parse
from typing import Any

import httpx
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver

from external_service_clients.anthropic_claude_api_client import (
    get_authenticated_anthropic_claude_client,
)
from orchestrator.pipeline_state import IdeaRadarPipelineState
from pipeline_log_streaming.agent_progress_log_event_streamer import (
    stream_agent_progress_log_event_to_nodejs_backend,
)

# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _extract_json_from_text(text: str) -> Any:
    """Strip markdown fences and parse JSON from a Claude response."""
    cleaned = text.strip()
    code_block = re.search(r"```(?:json)?\s*([\s\S]*?)```", cleaned)
    if code_block:
        cleaned = code_block.group(1).strip()
    return json.loads(cleaned)


async def _call_claude(model: str, max_tokens: int, prompt: str) -> str:
    """Thin wrapper around the Anthropic async client."""
    client = get_authenticated_anthropic_claude_client()
    response = await client.messages.create(
        model=model,
        max_tokens=max_tokens,
        messages=[{"role": "user", "content": prompt}],
    )
    return response.content[0].text


# ---------------------------------------------------------------------------
# Node: scout
# ---------------------------------------------------------------------------

async def scout_node(state: IdeaRadarPipelineState) -> dict:
    topic = state.get("topic", "")
    search_job_id = state.get("search_job_id", "")
    nodejs_log_callback_url = state.get("nodejs_log_callback_url", "")

    os.environ["NODEJS_BACKEND_LOG_ENDPOINT_URL"] = nodejs_log_callback_url

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="scraping",
        human_readable_log_message=f"🔍 Scout: Searching HackerNews for '{topic}' pain points...",
    )

    async def _fetch_hn_async(query: str, hits: int = 15) -> list[dict]:
        url = (
            f"https://hn.algolia.com/api/v1/search"
            f"?query={urllib.parse.quote(query)}&tags=comment&hitsPerPage={hits}"
        )
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(url)
                resp.raise_for_status()
                results = []
                for hit in resp.json().get("hits", []):
                    text = hit.get("comment_text", "")
                    if not text or len(text) < 50:
                        continue
                    # Clean basic HTML tags
                    clean = (
                        text.replace("<p>", "\n").replace("</p>", "")
                        .replace("<i>", "").replace("</i>", "")
                        .replace("<a>", "").replace("</a>", "")
                        .replace("<b>", "").replace("</b>", "")
                        .replace("&#x27;", "'").replace("&amp;", "&")
                        .replace("&lt;", "<").replace("&gt;", ">")
                    )
                    obj_id = hit.get("objectID", "")
                    author = hit.get("author", "anonymous")
                    story_t = hit.get("story_title") or hit.get("story_text", "")[:60] or "HN Discussion"
                    date = (hit.get("created_at", "") or "")[:10]
                    hn_url = (
                        f"https://news.ycombinator.com/item?id={obj_id}"
                        if obj_id
                        else "https://news.ycombinator.com"
                    )
                    results.append({
                        "text": clean,
                        "author": author,
                        "url": hn_url,
                        "story_title": story_t,
                        "date": date,
                    })
                return results
        except Exception as err:
            print(f"[scout_node] HN fetch error: {err}")
            return []

    try:
        sources = await _fetch_hn_async(f"{topic} problem pain")
        if not sources:
            sources = await _fetch_hn_async(topic)
        if not sources:
            sources = [{
                "text": f"No deep discussions found for '{topic}'.",
                "author": "N/A",
                "url": "",
                "story_title": "",
                "date": "",
            }]

        sources = sources[:15]
        raw_data = [s["text"] for s in sources]

        await stream_agent_progress_log_event_to_nodejs_backend(
            search_job_id=search_job_id,
            log_event_type="log",
            pipeline_stage="scraping",
            human_readable_log_message=f"🔍 HackerNews — {len(sources)} discussions found",
        )

        return {"raw_data": raw_data, "raw_sources": sources}

    except Exception as err:
        print(f"[scout_node] Error: {err}")
        fallback = [{
            "text": f"Error searching for {topic}: {err}",
            "author": "N/A",
            "url": "",
            "story_title": "",
            "date": "",
        }]
        return {"raw_data": [fallback[0]["text"]], "raw_sources": fallback}


# ---------------------------------------------------------------------------
# Node: researcher
# ---------------------------------------------------------------------------

async def researcher_node(state: IdeaRadarPipelineState) -> dict:
    topic = state.get("topic", "")
    search_job_id = state.get("search_job_id", "")
    nodejs_log_callback_url = state.get("nodejs_log_callback_url", "")

    os.environ["NODEJS_BACKEND_LOG_ENDPOINT_URL"] = nodejs_log_callback_url

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="scraping",
        human_readable_log_message="🔍 Researcher: Deep-diving via web search...",
    )

    new_raw_data: list[str] = []
    new_raw_sources: list[dict] = []
    research_notes: list[str] = []

    queries = [
        f"site:reddit.com {topic} pain points",
        f"site:producthunt.com {topic} complaints alternatives",
        f"{topic} frustrating problems users",
        f"best {topic} software but missing features",
        f"{topic} what's broken",
    ]

    def _run_ddgs_queries(queries: list[str]) -> list[dict]:
        """Run DuckDuckGo searches synchronously (DDGS is sync-only)."""
        results = []
        try:
            from ddgs import DDGS
            with DDGS() as ddgs:
                for query in queries:
                    try:
                        for r in ddgs.text(query, max_results=8):
                            text = r.get("body", "")
                            title = r.get("title", "Search Result")
                            url = r.get("href", "")
                            if len(text) > 50:
                                source_label = "Web Search"
                                if "reddit.com" in url:
                                    source_label = "Reddit"
                                elif "producthunt.com" in url:
                                    source_label = "ProductHunt"
                                elif "youtube.com" in url:
                                    source_label = "YouTube"
                                results.append({
                                    "text": text,
                                    "author": source_label,
                                    "url": url,
                                    "story_title": title,
                                    "date": "Recent",
                                    "source_label": source_label,
                                })
                    except Exception as query_err:
                        print(f"[researcher_node] DDGS query error: {query_err}")
        except Exception as ddgs_err:
            print(f"[researcher_node] DDGS error: {ddgs_err}")
        return results

    try:
        loop = asyncio.get_event_loop()
        ddgs_results = await loop.run_in_executor(None, _run_ddgs_queries, queries)

        for r in ddgs_results:
            new_raw_data.append(r["text"])
            new_raw_sources.append({
                "text": r["text"],
                "author": r["author"],
                "url": r["url"],
                "story_title": r["story_title"],
                "date": r["date"],
            })
            research_notes.append(
                f"Source: {r['story_title']} ({r['source_label']})\n"
                f"URL: {r['url']}\nFinding: {r['text']}"
            )
    except Exception as err:
        print(f"[researcher_node] Web search error: {err}")

    # Optional: try Reddit PRAW if credentials are available
    reddit_client_id = os.environ.get("REDDIT_CLIENT_ID", "")
    if reddit_client_id:
        def _run_praw_search() -> list[dict]:
            praw_results = []
            try:
                import praw
                reddit = praw.Reddit(
                    client_id=reddit_client_id,
                    client_secret=os.environ.get("REDDIT_CLIENT_SECRET", ""),
                    user_agent=os.environ.get("REDDIT_USER_AGENT", "FluxIdeas/1.0"),
                )
                subreddits = ["entrepreneur", "SaaS", "startups", "webdev"]
                for sub_name in subreddits:
                    try:
                        sub = reddit.subreddit(sub_name)
                        for submission in sub.search(topic, limit=5):
                            if submission.score >= 5:
                                body = submission.selftext or ""
                                if len(body) > 50:
                                    praw_results.append({
                                        "text": f"{submission.title}\n{body[:1000]}",
                                        "author": "Reddit",
                                        "url": f"https://reddit.com{submission.permalink}",
                                        "story_title": submission.title,
                                        "date": "Recent",
                                    })
                    except Exception as sub_err:
                        print(f"[researcher_node] PRAW sub error: {sub_err}")
            except Exception as praw_err:
                print(f"[researcher_node] PRAW error: {praw_err}")
            return praw_results

        try:
            loop = asyncio.get_event_loop()
            praw_results = await loop.run_in_executor(None, _run_praw_search)
            for r in praw_results:
                new_raw_data.append(r["text"])
                new_raw_sources.append(r)
        except Exception as err:
            print(f"[researcher_node] PRAW executor error: {err}")

    current_data = list(state.get("raw_data", [])) + new_raw_data
    current_sources = list(state.get("raw_sources", [])) + new_raw_sources
    current_rounds = state.get("research_rounds", 0) + 1

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="scraping",
        human_readable_log_message=f"🔍 Web search — {len(new_raw_data)} findings collected",
    )

    return {
        "raw_data": current_data,
        "raw_sources": current_sources,
        "research_notes": research_notes,
        "research_rounds": current_rounds,
        "need_more_research": False,
    }


# ---------------------------------------------------------------------------
# Node: reasoner
# ---------------------------------------------------------------------------

async def reasoner_node(state: IdeaRadarPipelineState) -> dict:
    topic = state.get("topic", "")
    search_job_id = state.get("search_job_id", "")
    nodejs_log_callback_url = state.get("nodejs_log_callback_url", "")
    raw_data = state.get("raw_data", [])

    os.environ["NODEJS_BACKEND_LOG_ENDPOINT_URL"] = nodejs_log_callback_url

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="clustering",
        human_readable_log_message=f"🧠 Reasoner: Synthesizing {len(raw_data)} data points with Claude...",
    )

    raw_text = "\n\n".join(raw_data)[:20000]

    prompt = f"""You are a Deep Reasoning Agent. Perform a Chain-of-Thought analysis on raw market data.

Topic: {topic}

Raw Data:
{raw_text}

Analyze and return ONLY valid JSON (no markdown, no explanation):
{{
  "quality_check": "PASS or FAIL (FAIL if data is too thin, generic, or low-quality)",
  "core_clusters": ["cluster 1...", "cluster 2...", "cluster 3..."],
  "market_intensity": "summary of how desperate users are",
  "key_themes": ["theme 1...", "theme 2...", "theme 3..."]
}}"""

    try:
        response_text = await _call_claude(
            model="claude-haiku-4-5-20251001",
            max_tokens=2048,
            prompt=prompt,
        )
        analysis = _extract_json_from_text(response_text)
        need_more = (
            analysis.get("quality_check") == "FAIL"
            and state.get("research_rounds", 0) < 2
        )
        return {
            "reasoning_log": json.dumps(analysis),
            "need_more_research": need_more,
        }
    except Exception as err:
        print(f"[reasoner_node] Error: {err}")
        return {
            "reasoning_log": json.dumps({"quality_check": "PASS", "core_clusters": [], "market_intensity": "unknown", "key_themes": []}),
            "need_more_research": False,
        }


# ---------------------------------------------------------------------------
# Node: analyst
# ---------------------------------------------------------------------------

async def analyst_node(state: IdeaRadarPipelineState) -> dict:
    search_job_id = state.get("search_job_id", "")
    nodejs_log_callback_url = state.get("nodejs_log_callback_url", "")
    raw_sources = state.get("raw_sources", [])
    raw_data = state.get("raw_data", [])
    founder_profile = state.get("founder_profile") or {}

    os.environ["NODEJS_BACKEND_LOG_ENDPOINT_URL"] = nodejs_log_callback_url

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="clustering",
        human_readable_log_message="📊 Analyst: Ranking market opportunities...",
    )

    # Build enriched text with attribution
    enriched_parts: list[str] = []
    for i, src in enumerate(raw_sources):
        author = src.get("author", "anonymous")
        url = src.get("url", "")
        title = src.get("story_title", "")
        date = src.get("date", "")
        text = src.get("text", "")
        enriched_parts.append(
            f"[Source {i+1}] Author: {author} | Thread: {title} | Date: {date} | URL: {url}\n{text}"
        )
    raw_text = "\n\n---\n\n".join(enriched_parts) if enriched_parts else "\n\n".join(raw_data)

    founder_context = (
        f"Skills: {founder_profile.get('skills', 'None')}, "
        f"Budget: {founder_profile.get('budget', 'None')}, "
        f"Time: {founder_profile.get('time', 'None')}"
    ) if founder_profile else "No founder profile provided."

    prompt = f"""You are an expert Venture Capital Analyst and Product Strategist.
Identify the top business problems/gaps based on the provided research. Return between 5 and 10 problems — only as many as the data genuinely supports.

CRITICAL: Factor in the FOUNDER PROFILE. If an idea matches their skills, give it a higher founder_fit_score.
FOUNDER PROFILE: {founder_context}

DATA (with sources):
{raw_text[:20000]}

For each idea, provide a JSON object with these EXACT keys:
- "problem_name": concise title (3-6 words)
- "market_gap": 1-2 sentences explaining the gap
- "urgency_score": integer 1-10
- "commercial_potential": integer 1-10
- "feasibility_score": integer 1-10
- "founder_fit_score": integer 1-10 (how well this matches the founder's skills/budget)
- "market_score": float 1-10 (weighted average of the above scores)
- "target_customer": who has this problem?
- "description": 2 sentences on the core problem pain point
- "sentiment": 1 word describing user emotion
- "source_refs": list of 1-3 objects {{"author": "...", "url": "...", "title": "..."}} from the data

Return ONLY a JSON array (5–10 objects), sorted by market_score (highest first). No markdown, no explanation."""

    try:
        response_text = await _call_claude(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            prompt=prompt,
        )
        problems = _extract_json_from_text(response_text)

        # Normalise: handle dict-wrapped lists
        if isinstance(problems, dict):
            for v in problems.values():
                if isinstance(v, list):
                    problems = v
                    break
            else:
                problems = [problems]

        if isinstance(problems, list):
            normalized: list[dict] = []
            for p in problems:
                if not isinstance(p, dict):
                    continue
                norm = {k.lower().replace("_", "").replace(" ", ""): v for k, v in p.items()}
                entry = {
                    "problem_name": norm.get("problemname", p.get("problem_name", "Unknown Problem")),
                    "market_gap": norm.get("marketgap", p.get("market_gap", "")),
                    "urgency_score": norm.get("urgencyscore", p.get("urgency_score", 5)),
                    "commercial_potential": norm.get("commercialpotential", p.get("commercial_potential", 5)),
                    "feasibility_score": norm.get("feasibilityscore", p.get("feasibility_score", 5)),
                    "founder_fit_score": norm.get("founderfitscore", p.get("founder_fit_score", 5)),
                    "market_score": norm.get("marketscore", p.get("market_score", 5.0)),
                    "target_customer": norm.get("targetcustomer", p.get("target_customer", "Unknown")),
                    "description": norm.get("description", p.get("description", "")),
                    "sentiment": norm.get("sentiment", p.get("sentiment", "Neutral")),
                    "source_refs": p.get("source_refs", []),
                }
                try:
                    score = float(entry["market_score"])
                    if score > 10:
                        entry["market_score"] = round(score / 10, 1)
                except Exception:
                    pass
                normalized.append(entry)
            problems = sorted(normalized, key=lambda x: float(x.get("market_score", 0)), reverse=True)

        await stream_agent_progress_log_event_to_nodejs_backend(
            search_job_id=search_job_id,
            log_event_type="log",
            pipeline_stage="clustering",
            human_readable_log_message=f"📊 Found {len(problems)} validated problem opportunities ✓",
        )

        return {"identified_problems": problems}

    except Exception as err:
        print(f"[analyst_node] Error: {err}")
        return {"identified_problems": [{"problem_name": "Analysis error", "market_score": 0, "sentiment": str(err)[:80]}]}


# ---------------------------------------------------------------------------
# Node: ask_human (interrupt point)
# ---------------------------------------------------------------------------

async def ask_human_node(state: IdeaRadarPipelineState) -> dict:
    """Pause point — the graph is interrupted before this node executes."""
    return {}


# ---------------------------------------------------------------------------
# Node: strategist
# ---------------------------------------------------------------------------

async def strategist_node(state: IdeaRadarPipelineState) -> dict:
    search_job_id = state.get("search_job_id", "")
    nodejs_log_callback_url = state.get("nodejs_log_callback_url", "")
    selected_problem = state.get("selected_problem") or {}

    os.environ["NODEJS_BACKEND_LOG_ENDPOINT_URL"] = nodejs_log_callback_url

    problem_name = selected_problem.get("problem_name", "Unknown Problem")
    description = selected_problem.get("description", "")
    target_cust = selected_problem.get("target_customer", "")
    sentiment = selected_problem.get("sentiment", "unknown")
    market_score = selected_problem.get("market_score", 0)
    source_refs = selected_problem.get("source_refs", [])

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="validating",
        human_readable_log_message="📈 Strategist: Building full founder's dossier...",
    )

    prompt = f"""You are an elite startup strategist and business analyst.
You have been given a validated market problem identified from real internet discussions.
Generate a comprehensive Founder's Dossier as a JSON object.

Problem: {problem_name}
Description: {description}
Target Customer: {target_cust}
User Sentiment: {sentiment}
Market Score: {market_score}/10
Source References: {json.dumps(source_refs)}

Return ONLY a JSON object with these exact top-level keys (no markdown, no explanation):

{{
  "signal_strength": {{
    "mention_count": <integer estimate of discussions about this pain>,
    "source_summary": "<1 sentence: where and how often this pain appears online>",
    "validation": "<1 sentence on why this signal is reliable>"
  }},
  "market_gap_score": {{
    "total": <integer 1-10>,
    "urgency": <integer 1-10>,
    "commercial_potential": <integer 1-10>,
    "feasibility": <integer 1-10>,
    "rationale": "<2 sentences explaining the scores>"
  }},
  "voice_of_customer": [
    {{"quote": "<verbatim or paraphrased user quote>", "author": "<username>", "source": "<HN / Reddit / Forum>", "url": "<direct link>"}},
    {{"quote": "<another quote>", "author": "<username>", "source": "<source>", "url": "<url>"}},
    {{"quote": "<another quote>", "author": "<username>", "source": "<source>", "url": "<url>"}}
  ],
  "mvp_blueprint": {{
    "feature_1": {{"name": "<name>", "description": "<what it does and why it is the core utility>"}},
    "feature_2": {{"name": "<name>", "description": "<the hook that keeps users coming back>"}},
    "feature_3": {{"name": "<name>", "description": "<admin or user management layer>"}}
  }},
  "competitive_landscape": [
    {{"competitor": "<Name>", "weakness": "<their key weakness>", "your_edge": "<how you beat them>"}},
    {{"competitor": "<Name>", "weakness": "<weakness>", "your_edge": "<edge>"}},
    {{"competitor": "<Name>", "weakness": "<weakness>", "your_edge": "<edge>"}}
  ],
  "technical_roadmap": {{
    "tech_stack": "<e.g. Next.js + Supabase + Python FastAPI>",
    "data_model": ["<Table1: purpose>", "<Table2: purpose>", "<Table3: purpose>", "<Table4: purpose>"],
    "timeline": "<e.g. Solo developer: 3-4 weeks to MVP>",
    "week_plan": [
      {{"week": 1, "focus": "<what to build>"}},
      {{"week": 2, "focus": "<what to build>"}},
      {{"week": 3, "focus": "<what to build>"}},
      {{"week": 4, "focus": "<what to build>"}}
    ]
  }},
  "monetization": {{
    "model": "<Subscription / Freemium / Transaction-based>",
    "price_point": "<e.g. $29/user/month>",
    "rationale": "<1-2 sentences on why this pricing makes sense for this market>"
  }}
}}"""

    try:
        response_text = await _call_claude(
            model="claude-sonnet-4-6",
            max_tokens=4096,
            prompt=prompt,
        )
        dossier = _extract_json_from_text(response_text)
        return {"blueprint": dossier}
    except Exception as err:
        print(f"[strategist_node] Error: {err}")
        fallback = {
            "signal_strength": {"mention_count": 0, "source_summary": "Error", "validation": str(err)},
            "market_gap_score": {"total": 0, "urgency": 0, "commercial_potential": 0, "feasibility": 0, "rationale": ""},
            "voice_of_customer": [],
            "mvp_blueprint": {},
            "competitive_landscape": [],
            "technical_roadmap": {"tech_stack": "", "data_model": [], "timeline": "", "week_plan": []},
            "monetization": {"model": "", "price_point": "", "rationale": ""},
        }
        return {"blueprint": fallback}


# ---------------------------------------------------------------------------
# Node: economist
# ---------------------------------------------------------------------------

async def economist_node(state: IdeaRadarPipelineState) -> dict:
    search_job_id = state.get("search_job_id", "")
    nodejs_log_callback_url = state.get("nodejs_log_callback_url", "")
    selected_problem = state.get("selected_problem") or {}

    os.environ["NODEJS_BACKEND_LOG_ENDPOINT_URL"] = nodejs_log_callback_url

    problem_name = selected_problem.get("problem_name", "Unknown")
    target_cust = selected_problem.get("target_customer", "")

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="validating",
        human_readable_log_message="💰 Economist: Calculating TAM/SAM/SOM...",
    )

    queries = [
        f"{problem_name} market size statistics",
        f"{target_cust} market valuation",
        f"industry growth {problem_name}",
    ]

    stats_data: list[str] = []

    def _run_economist_ddgs(queries: list[str]) -> list[str]:
        results = []
        try:
            from ddgs import DDGS
            with DDGS() as ddgs:
                for q in queries:
                    try:
                        for r in ddgs.text(q, max_results=3):
                            results.append(f"Title: {r.get('title', '')}\nSnippet: {r.get('body', '')}")
                    except Exception as q_err:
                        print(f"[economist_node] DDGS query error: {q_err}")
        except Exception as err:
            print(f"[economist_node] DDGS error: {err}")
        return results

    try:
        loop = asyncio.get_event_loop()
        stats_data = await loop.run_in_executor(None, _run_economist_ddgs, queries)
    except Exception as err:
        print(f"[economist_node] Search executor error: {err}")

    prompt = f"""You are an expert Venture Capital Economist.
Estimate the market size for a new business idea based on search statistics.

Idea: {problem_name}
Target Customer: {target_cust}
Search Data:
{chr(10).join(stats_data) if stats_data else "No search data available — use domain knowledge."}

Return ONLY valid JSON (no markdown, no explanation):
{{
  "tam": "Total Addressable Market (e.g. $10B)",
  "sam": "Serviceable Addressable Market",
  "som": "Serviceable Obtainable Market (Year 1-3 goal)",
  "growth_rate": "CAGR or industry growth percentage",
  "economist_verdict": "2 sentence summary on market attractiveness"
}}"""

    try:
        response_text = await _call_claude(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            prompt=prompt,
        )
        analysis = _extract_json_from_text(response_text)
        return {"market_size_analysis": analysis}
    except Exception as err:
        print(f"[economist_node] Claude error: {err}")
        return {
            "market_size_analysis": {
                "tam": "Unknown",
                "sam": "Unknown",
                "som": "Unknown",
                "growth_rate": "N/A",
                "economist_verdict": str(err),
            }
        }


# ---------------------------------------------------------------------------
# Node: designer
# ---------------------------------------------------------------------------

async def designer_node(state: IdeaRadarPipelineState) -> dict:
    search_job_id = state.get("search_job_id", "")
    nodejs_log_callback_url = state.get("nodejs_log_callback_url", "")
    blueprint = state.get("blueprint") or {}
    selected_problem = state.get("selected_problem") or {}

    os.environ["NODEJS_BACKEND_LOG_ENDPOINT_URL"] = nodejs_log_callback_url

    problem_name = selected_problem.get("problem_name", "Software Product")
    mvp = blueprint.get("mvp_blueprint", {})

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="generating",
        human_readable_log_message="🎨 Designer: Generating UI mockup...",
    )

    feature_names = [
        v.get("name", "") for k, v in mvp.items() if isinstance(v, dict)
    ]
    feature_str = ", ".join(f for f in feature_names if f)

    base_prompt = (
        f"Professional clean UI UX design for {problem_name}, a software product"
        f" featuring {feature_str}. High resolution, modern aesthetic, dark mode,"
        f" dashboard layout, 4k, tech startup style."
    )
    encoded_prompt = urllib.parse.quote(base_prompt)
    mockup_url = (
        f"https://image.pollinations.ai/prompt/{encoded_prompt}"
        f"?width=1024&height=768&nologo=true"
    )

    return {"mockup_url": mockup_url}


# ---------------------------------------------------------------------------
# Node: critic
# ---------------------------------------------------------------------------

async def critic_node(state: IdeaRadarPipelineState) -> dict:
    search_job_id = state.get("search_job_id", "")
    nodejs_log_callback_url = state.get("nodejs_log_callback_url", "")
    selected_problem = state.get("selected_problem") or {}
    blueprint = state.get("blueprint") or {}

    os.environ["NODEJS_BACKEND_LOG_ENDPOINT_URL"] = nodejs_log_callback_url

    problem_name = selected_problem.get("problem_name", "Unknown")

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="validating",
        human_readable_log_message="🕵️ Critic: Running red-team risk audit...",
    )

    prompt = f"""You are a cynical "Red Team" VC Critic.
Your job is to find exactly why this business idea will FAIL. Be brutal but objective.

Idea: {problem_name}
Blueprint: {json.dumps(blueprint)[:3000]}

Return ONLY valid JSON (no markdown, no explanation):
{{
  "technical_risk": "Biggest technical hurdle",
  "market_risk": "Why users might not switch from current habits",
  "legal_risk": "Potential regulatory or IP blockers",
  "kill_switch_criteria": "A specific metric or event that means the founder should QUIT this idea",
  "survival_strategy": "1 sentence on how to mitigate the biggest risk"
}}"""

    try:
        response_text = await _call_claude(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            prompt=prompt,
        )
        analysis = _extract_json_from_text(response_text)
        return {"risk_assessment": analysis}
    except Exception as err:
        print(f"[critic_node] Error: {err}")
        return {
            "risk_assessment": {
                "technical_risk": "Unknown",
                "market_risk": "Unknown",
                "legal_risk": "N/A",
                "kill_switch_criteria": "N/A",
                "survival_strategy": str(err),
            }
        }


# ---------------------------------------------------------------------------
# Node: reporter
# ---------------------------------------------------------------------------

async def reporter_node(state: IdeaRadarPipelineState) -> dict:
    search_job_id = state.get("search_job_id", "")
    nodejs_log_callback_url = state.get("nodejs_log_callback_url", "")
    selected_problem = state.get("selected_problem") or {}
    blueprint = state.get("blueprint") or {}
    market_size_analysis = state.get("market_size_analysis") or {}
    risk_assessment = state.get("risk_assessment") or {}
    topic = state.get("topic", "Market Research")

    os.environ["NODEJS_BACKEND_LOG_ENDPOINT_URL"] = nodejs_log_callback_url

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="log",
        pipeline_stage="generating",
        human_readable_log_message="📊 Generating final report...",
    )

    pdf_url: str | None = None
    pptx_url: str | None = None

    # --- PDF via existing pipeline ---
    try:
        from datetime import datetime
        from data_models.clustering_agent_data_models import ProblemCluster
        from data_models.validation_agent_data_models import (
            ValidationAgentOutput,
            ValidatedProblem,
            ExistingSolutionCompetitor,
        )
        from pipeline_agents.report_agent.report_agent_runner import (
            run_report_agent_and_generate_pdf,
        )

        problem_name = selected_problem.get("problem_name", "Unknown Problem")
        market_gap = selected_problem.get("market_gap", blueprint.get("market_gap_score", {}).get("rationale", ""))
        description = selected_problem.get("description", market_gap)
        target_customer = selected_problem.get("target_customer", "")

        # Build a ProblemCluster from available data
        voice_of_customer = blueprint.get("voice_of_customer", [])
        quotes = [v.get("quote", "") for v in voice_of_customer[:5] if isinstance(v, dict)]
        if not quotes:
            quotes = [description] if description else ["No evidence quotes available."]

        competitive_landscape = blueprint.get("competitive_landscape", [])
        sources = ["hackernews", "web"]

        problem_cluster = ProblemCluster(
            cluster_id="cluster_1",
            problem_title=problem_name,
            problem_description=description or market_gap,
            supporting_evidence_quotes=quotes,
            affected_user_persona=target_customer,
            estimated_frequency_in_collected_posts=selected_problem.get("urgency_score", 5),
            primary_data_sources=sources,
        )

        existing_solutions = []
        for comp in competitive_landscape[:4]:
            if isinstance(comp, dict):
                existing_solutions.append(
                    ExistingSolutionCompetitor(
                        competitor_name=comp.get("competitor", "Unknown"),
                        competitor_description=comp.get("your_edge", ""),
                        key_weakness_or_gap=comp.get("weakness", ""),
                    )
                )

        mvp_blueprint = blueprint.get("mvp_blueprint", {})
        mvp_features = [
            f"{v.get('name', '')}: {v.get('description', '')}"
            for k, v in mvp_blueprint.items()
            if isinstance(v, dict)
        ]
        mvp_text = " | ".join(mvp_features) if mvp_features else "Build an MVP targeting the core pain point."

        monetization = blueprint.get("monetization", {})
        monetization_text = (
            f"{monetization.get('model', '')} at {monetization.get('price_point', '')} — "
            f"{monetization.get('rationale', '')}"
        ).strip(" —")

        market_gap_score = blueprint.get("market_gap_score", {})
        opportunity_score = int(market_gap_score.get("total", selected_problem.get("urgency_score", 5)))
        opportunity_score = max(1, min(10, opportunity_score))

        tam = market_size_analysis.get("tam", "Unknown TAM")

        validated_problem = ValidatedProblem(
            source_problem_cluster=problem_cluster,
            opportunity_gap_score=opportunity_score,
            market_size_estimate=tam,
            existing_solutions=existing_solutions,
            suggested_mvp_approach=mvp_text,
            target_customer_segment=target_customer,
            monetization_potential=monetization_text or "Subscription model",
            validation_reasoning=blueprint.get("market_gap_score", {}).get("rationale", "High opportunity gap identified."),
        )

        now = datetime.utcnow()
        validation_output = ValidationAgentOutput(
            research_topic=topic,
            search_job_id=search_job_id,
            validated_problems=[validated_problem],
            total_problems_validated_count=1,
            validation_started_at_utc=now,
            validation_finished_at_utc=now,
        )

        report_output = await run_report_agent_and_generate_pdf(
            validation_agent_output=validation_output,
        )
        pdf_url = report_output.pdf_report_cloudinary_url
    except Exception as err:
        print(f"[reporter_node] PDF generation error: {err}")

    # --- PPTX ---
    try:
        from pipeline_agents.report_agent.pptx_pitch_deck_service import (
            generate_pptx_pitch_deck_bytes,
        )
        from pipeline_agents.report_agent.cloudinary_pdf_upload_service import (
            upload_pdf_report_bytes_to_cloudinary,
        )

        problem_name = selected_problem.get("problem_name", "Market Opportunity")
        pptx_bytes = generate_pptx_pitch_deck_bytes(
            problem_name=problem_name,
            dossier=blueprint,
            market_analysis=market_size_analysis,
            risk_assessment=risk_assessment,
        )
        pptx_url = await upload_pdf_report_bytes_to_cloudinary(
            pdf_bytes=pptx_bytes,
            research_topic=f"{problem_name}_deck",
            search_job_id=search_job_id,
        )
    except Exception as err:
        print(f"[reporter_node] PPTX generation/upload error: {err}")

    await stream_agent_progress_log_event_to_nodejs_backend(
        search_job_id=search_job_id,
        log_event_type="complete",
        pipeline_stage="done",
        human_readable_log_message="✅ Pipeline complete!",
        optional_payload_data={"pdfUrl": pdf_url, "pptxUrl": pptx_url},
    )

    return {"pdf_url": pdf_url, "pptx_url": pptx_url, "reporter_attempted": True}


# ---------------------------------------------------------------------------
# Node: orchestrator
# ---------------------------------------------------------------------------

async def orchestrator_node(state: IdeaRadarPipelineState) -> dict:
    raw_data = state.get("raw_data", [])
    research = state.get("research_notes", [])
    reasoning = state.get("reasoning_log", "")
    problems = state.get("identified_problems", [])
    selected = state.get("selected_problem")
    blueprint = state.get("blueprint")
    market = state.get("market_size_analysis")
    mockup = state.get("mockup_url")
    risk = state.get("risk_assessment")
    pdf = state.get("pdf_url")
    need_more = state.get("need_more_research", False)
    rounds = state.get("research_rounds", 0)

    if not raw_data:
        return {"next_agent": "scout"}
    if need_more and rounds < 2:
        return {"next_agent": "researcher"}
    if not research:
        return {"next_agent": "researcher"}
    if not reasoning:
        return {"next_agent": "reasoner"}
    if not problems:
        return {"next_agent": "analyst"}
    if not selected:
        return {"next_agent": "ask_human"}
    if not blueprint:
        return {"next_agent": "strategist"}
    if not market:
        return {"next_agent": "economist"}
    if not mockup:
        return {"next_agent": "designer"}
    if not risk:
        return {"next_agent": "critic"}
    if not pdf and not state.get("reporter_attempted"):
        return {"next_agent": "reporter"}
    return {"next_agent": "END"}


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------

def route_from_orchestrator(state: IdeaRadarPipelineState) -> str:
    next_agent = state.get("next_agent", "END")
    if next_agent == "END":
        return END
    return next_agent


# ---------------------------------------------------------------------------
# Graph assembly
# ---------------------------------------------------------------------------

def _build_pipeline_graph() -> StateGraph:
    workflow = StateGraph(IdeaRadarPipelineState)

    workflow.add_node("orchestrator", orchestrator_node)
    workflow.add_node("scout", scout_node)
    workflow.add_node("researcher", researcher_node)
    workflow.add_node("reasoner", reasoner_node)
    workflow.add_node("analyst", analyst_node)
    workflow.add_node("ask_human", ask_human_node)
    workflow.add_node("strategist", strategist_node)
    workflow.add_node("economist", economist_node)
    workflow.add_node("designer", designer_node)
    workflow.add_node("critic", critic_node)
    workflow.add_node("reporter", reporter_node)

    workflow.set_entry_point("orchestrator")
    workflow.add_conditional_edges("orchestrator", route_from_orchestrator)

    for node_name in [
        "scout", "researcher", "reasoner", "analyst", "ask_human",
        "strategist", "economist", "designer", "critic", "reporter",
    ]:
        workflow.add_edge(node_name, "orchestrator")

    return workflow


_memory = MemorySaver()
compiled_pipeline_graph = _build_pipeline_graph().compile(
    checkpointer=_memory,
    interrupt_before=["ask_human"],
)
