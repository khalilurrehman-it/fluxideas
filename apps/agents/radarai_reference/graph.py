from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from src.state import IdeaRadarState
import time
import os
import json
from dotenv import load_dotenv
from tavily import TavilyClient
from langchain_community.chat_models import ChatOllama
from langchain_core.prompts import PromptTemplate
from langchain_core.output_parsers import JsonOutputParser, StrOutputParser

load_dotenv()

import requests
from ddgs import DDGS
import urllib.parse

def scout_node(state: IdeaRadarState):
    topic = state.get("topic")
    print(f"Scout Node: Deep searching for pain points related to '{topic}'...")

    def scrape_hn(query, hits=12):
        """Hit HackerNews Algolia API and return list of rich source dicts."""
        url = f"https://hn.algolia.com/api/v1/search?query={query}&tags=comment&hitsPerPage={hits}"
        resp = requests.get(url, timeout=10)
        resp.raise_for_status()
        results = []
        for hit in resp.json().get("hits", []):
            text = hit.get("comment_text", "")
            if not text or len(text) < 50:
                continue
            # Clean HTML
            clean = (text
                     .replace("<p>", "\n").replace("</p>", "")
                     .replace("<i>", "").replace("</i>", "")
                     .replace("<a>", "").replace("</a>", "")
                     .replace("<b>", "").replace("</b>", ""))
            obj_id   = hit.get("objectID", "")
            story_id = hit.get("story_id", "")
            author   = hit.get("author", "anonymous")
            story_t  = hit.get("story_title") or hit.get("story_text", "")[:60] or "HN Discussion"
            date     = (hit.get("created_at", "") or "")[:10]
            hn_url   = f"https://news.ycombinator.com/item?id={obj_id}" if obj_id else "https://news.ycombinator.com"
            results.append({
                "text":        clean,
                "author":      author,
                "url":         hn_url,
                "story_title": story_t,
                "date":        date,
            })
        return results

    try:
        sources = scrape_hn(f"{topic} problem pain")
        if not sources:
            sources = scrape_hn(topic)   # broader fallback
        if not sources:
            sources = [{"text": f"No deep discussions found for '{topic}'.",
                        "author": "N/A", "url": "", "story_title": "", "date": ""}]

        sources = sources[:10]
        raw_data = [s["text"] for s in sources]
        return {"raw_data": raw_data, "raw_sources": sources}

    except Exception as e:
        print(f"Scout Error: {e}")
        fallback = [{"text": f"Error searching for {topic}: {e}",
                     "author": "N/A", "url": "", "story_title": "", "date": ""}]
        return {"raw_data": [fallback[0]["text"]], "raw_sources": fallback}

def researcher_node(state: IdeaRadarState):
    topic = state.get("topic")
    print(f"Researcher Node: Diving deeper into '{topic}' via DuckDuckGo...")
    
    research_notes = []
    new_raw_data = []
    new_raw_sources = []
    
    try:
        with DDGS() as ddgs:
            # Multi-source intelligence queries
            queries = [
                f"site:reddit.com {topic} pain points",
                f"site:producthunt.com {topic} alternatives complaints",
                f"site:youtube.com {topic} tutorial problems comments",
                f"why {topic} is frustrating to use",
                f"best software for {topic} but missing features"
            ]
            
            for query in queries:
                results = list(ddgs.text(query, max_results=4))
                for r in results:
                    text = r.get("body", "")
                    title = r.get("title", "Search Result")
                    url = r.get("href", "")
                    
                    # Identify source type for better metadata
                    source_label = "Web Search"
                    if "reddit.com" in url: source_label = "Reddit"
                    elif "producthunt.com" in url: source_label = "ProductHunt"
                    elif "youtube.com" in url: source_label = "YouTube"
                    
                    if len(text) > 50:
                        research_notes.append(f"Source: {title} ({source_label})\nURL: {url}\nFinding: {text}")
                        new_raw_data.append(text)
                        new_raw_sources.append({
                            "text": text,
                            "author": source_label,
                            "url": url,
                            "story_title": title,
                            "date": "Recent"
                        })
                        
        # Append to existing state instead of replacing
        current_data = state.get("raw_data", []) + new_raw_data
        current_sources = state.get("raw_sources", []) + new_raw_sources
        current_rounds = state.get("research_rounds", 0) + 1
        
        return {
            "raw_data": current_data,
            "raw_sources": current_sources,
            "research_notes": research_notes,
            "research_rounds": current_rounds,
            "need_more_research": False # Reset flag for now
        }
    except Exception as e:
        print(f"Researcher Error: {e}")
        return {"research_notes": [f"Deep research failed: {e}"]}

def reasoner_node(state: IdeaRadarState):
    print("Reasoner Node: Synthesizing data and identifying patterns...")
    raw_text = "\n\n".join(state.get('raw_data', []))
    topic = state.get("topic")
    
    ollama_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    llm = ChatOllama(model="nemotron-3-nano:30b-cloud", base_url=ollama_url, temperature=0.1)
    
    prompt = PromptTemplate(
        template="""You are a Deep Reasoning Agent. Your task is to perform a Chain-of-Thought analysis on raw market data.
        
        Topic: {topic}
        
        Raw Data:
        {raw_data}
        
        Perform the following analysis and provide a JSON response:
        - "quality_check": "PASS" or "FAIL" (FAIL if data is too thin, generic, or low-quality),
        - "reasoning_steps": ["step 1...", "step 2..."],
        - "core_clusters": ["cluster 1...", "cluster 2..."],
        - "market_intensity": "summary of how desperate users are",
        - "full_verdict": "Detailed synthesis of the most viable path forward"
        
        Return ONLY valid JSON.
        """,
        input_variables=["topic", "raw_data"]
    )
    
    try:
        chain = prompt | llm | JsonOutputParser()
        analysis = chain.invoke({"topic": topic, "raw_data": raw_text[:8000]}) # Limit text length for LLM
        
        need_more = False
        if analysis.get("quality_check") == "FAIL":
            need_more = True
            
        return {
            "reasoning_log": json.dumps(analysis),
            "need_more_research": need_more
        }
    except Exception as e:
        print(f"Reasoner Error: {e}")
        # If parsing fails, we assume it's just text or an error, don't loop
        return {"reasoning_log": f"Reasoning analysis failed: {e}", "need_more_research": False}



def analyst_node(state: IdeaRadarState):
    print(f"Analyst Node: Analyzing {len(state.get('raw_data', []))} raw data points...")
    
    # Build enriched text with source attribution
    sources = state.get('raw_sources', [])
    enriched_parts = []
    for i, src in enumerate(sources):
        author = src.get('author', 'anonymous')
        url    = src.get('url', '')
        title  = src.get('story_title', '')
        date   = src.get('date', '')
        text   = src.get('text', '')
        enriched_parts.append(f"[Source {i+1}] Author: {author} | Thread: {title} | Date: {date} | URL: {url}\n{text}")
    raw_text = "\n\n---\n\n".join(enriched_parts) if enriched_parts else "\n\n".join(state.get('raw_data', []))
    
    ollama_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    llm = ChatOllama(model="nemotron-3-nano:30b-cloud", base_url=ollama_url, format="json", temperature=0)
    
    prompt = PromptTemplate(
        template="""You are an expert Venture Capital Analyst and Product Strategist.
        Identify the TOP 10 most viable business problems/gaps based on the provided research.
        
        CRITICAL: Factor in the FOUNDER PROFILE. If an idea matches their skills, give it a higher 'founder_fit_score'.
        FOUNDER PROFILE: {founder_context}
        
        DATA (with sources):
        {raw_data}
        
        For each idea, provide a JSON object with these EXACT keys:
        - "problem_name": concise title (3-6 words)
        - "market_gap": 1-2 sentences explaining the gap
        - "urgency_score": integer 1-10
        - "commercial_potential": integer 1-10
        - "feasibility_score": integer 1-10
        - "founder_fit_score": integer 1-10 (How well this matches the founder's skills/budget)
        - "market_score": Final weighted average (out of 10)
        - "target_customer": who has this problem?
        - "description": 2 sentences on the core problem pain point
        - "sentiment": 1 word describing user emotion
        - "source_refs": List of 1-3 objects {{"author": "...", "url": "...", "title": "..."}} from the data.
        
        Return ONLY a JSON array of 10 objects, sorted by 'market_score' (highest first).
        """,
        input_variables=["raw_data", "founder_context"]
    )
    
    founder_profile = state.get('founder_profile', {})
    founder_context = f"Skills: {founder_profile.get('skills','None')}, Budget: {founder_profile.get('budget','None')}, Time: {founder_profile.get('time','None')}"

    try:
        chain = prompt | llm | JsonOutputParser()
        problems = chain.invoke({"raw_data": raw_text, "founder_context": founder_context})
        
        # Normalize output to handle dict-wrapped lists and key variations
        if isinstance(problems, dict):
            # Sometimes models return {"problems": [...]}
            for v in problems.values():
                if isinstance(v, list):
                    problems = v
                    break
            else:
                problems = [problems] # wrap dict in list

        if isinstance(problems, list):
            # Normalize keys to snake_case and provide fallbacks
            normalized_problems = []
            for p in problems:
                if not isinstance(p, dict):
                    continue
                # Create a lowercased, space-removed version of keys for robust matching
                norm_p = {k.lower().replace('_', '').replace(' ', ''): v for k, v in p.items()}
                
                new_p = {
                    "problem_name": norm_p.get("problemname", norm_p.get("title", p.get("problem_name", "Unknown Problem"))),
                    "market_gap": norm_p.get("marketgap", norm_p.get("gap", p.get("description", p.get("market_gap", "No description provided")))),
                    "urgency_score": norm_p.get("urgencyscore", norm_p.get("urgency", p.get("urgency_score", 5))),
                    "commercial_potential": norm_p.get("commercialpotential", p.get("commercial_potential", 5)),
                    "feasibility_score": norm_p.get("feasibilityscore", norm_p.get("feasibility", p.get("feasibility_score", 5))),
                    "founder_fit_score": norm_p.get("founderfitscore", norm_p.get("founderfit", p.get("founder_fit_score", 5))),
                    "market_score": norm_p.get("marketscore", p.get("market_score", 50)), # might be out of 10 or 100
                    "target_customer": norm_p.get("targetcustomer", p.get("target_customer", "Unknown")),
                    "description": norm_p.get("description", norm_p.get("problem", p.get("description", ""))),
                    "sentiment": norm_p.get("sentiment", p.get("sentiment", "Neutral")),
                    "source_refs": p.get("source_refs", [])
                }
                
                # Normalize market score to be out of 10 if it seems to be out of 100
                try:
                    score = float(new_p["market_score"])
                    if score > 10:
                        new_p["market_score"] = round(score / 10, 1)
                except:
                    pass
                    
                normalized_problems.append(new_p)
                
            problems = sorted(normalized_problems, key=lambda x: float(x.get("market_score", 0)), reverse=True)
            
        return {"identified_problems": problems}

    except Exception as e:
        print(f"Analyst Error: {e}")
        error_problem = {"problem_name": "Error during analysis", "sentiment": str(e)[:50], "market_score": 0}
        return {"identified_problems": [error_problem]}

def strategist_node(state: IdeaRadarState):
    selected_problem = state.get('selected_problem', {})
    problem_name = selected_problem.get('problem_name', 'Unknown Problem')
    description  = selected_problem.get('description', '')
    why_now      = selected_problem.get('why_now', '')
    target_cust  = selected_problem.get('target_customer', '')
    evidence     = selected_problem.get('evidence_quote', '')
    sentiment    = selected_problem.get('sentiment', 'unknown')
    market_score = selected_problem.get('market_score', 0)
    source_refs  = selected_problem.get('source_refs', [])
    source_refs_str = json.dumps(source_refs) if source_refs else '[]'
    print(f"Strategist Node: Building full dossier for '{problem_name}'...")

    ollama_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    llm = ChatOllama(model="nemotron-3-nano:30b-cloud", base_url=ollama_url, format="json", temperature=0.7)

    prompt = PromptTemplate(
        template="""You are an elite startup strategist and business analyst.
        You have been given a validated market problem identified from real internet discussions.
        Generate a comprehensive Founder's Dossier as a JSON object.

        Problem: {problem_name}
        Description: {description}
        Why Now: {why_now}
        Target Customer: {target_customer}
        Evidence: {evidence}
        User Sentiment: {sentiment}
        Market Score: {market_score}/100
        Source References (real URLs from research): {source_refs}

        Return ONLY a JSON object with these exact top-level keys:

        {{
          "signal_strength": {{
            "mention_count": <integer estimate of how many discussions exist about this pain>,
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
            {{"quote": "<verbatim or paraphrased user quote>", "author": "<username>", "source": "<HN / Reddit / Forum>", "url": "<direct link to discussion>"}},
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
        }}
        """,
        input_variables=["problem_name", "description", "why_now", "target_customer",
                         "evidence", "sentiment", "market_score", "source_refs"]
    )

    try:
        chain = prompt | llm | JsonOutputParser()
        dossier = chain.invoke({
            "problem_name":   problem_name,
            "description":    description,
            "why_now":        why_now,
            "target_customer":target_cust,
            "evidence":       evidence,
            "sentiment":      sentiment,
            "market_score":   market_score,
            "source_refs":    source_refs_str
        })
        return {"blueprint": dossier}
    except Exception as e:
        print(f"Strategist Error: {e}")
        fallback = {
            "signal_strength": {"mention_count": 0, "source_summary": "Error", "validation": str(e)},
            "market_gap_score": {"total": 0, "urgency": 0, "commercial_potential": 0, "feasibility": 0, "rationale": ""},
            "voice_of_customer": [],
            "mvp_blueprint": {},
            "competitive_landscape": [],
            "technical_roadmap": {"tech_stack": "", "data_model": [], "timeline": "", "week_plan": []},
            "monetization": {"model": "", "price_point": "", "rationale": ""}
        }
        return {"blueprint": fallback}


def economist_node(state: IdeaRadarState):
    selected_problem = state.get('selected_problem', {})
    problem_name = selected_problem.get('problem_name', 'Unknown')
    target_cust  = selected_problem.get('target_customer', '')
    
    print(f"Economist Node: Calculating market size for '{problem_name}'...")
    
    queries = [
        f"{problem_name} market size statistics",
        f"{target_cust} market valuation report",
        f"industry growth rate for {problem_name}"
    ]
    
    stats_data = []
    try:
        with DDGS() as ddgs:
            for q in queries:
                results = list(ddgs.text(q, max_results=3))
                for r in results:
                    stats_data.append(f"Title: {r.get('title')}\nSnippet: {r.get('body')}")
    except Exception as e:
        print(f"Economist Search Error: {e}")

    ollama_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    llm = ChatOllama(model="nemotron-3-nano:30b-cloud", base_url=ollama_url, format="json", temperature=0)

    prompt = PromptTemplate(
        template="""You are an expert Venture Capital Economist. 
        Your goal is to estimate the market size for a new business idea based on search statistics.
        
        Idea: {problem_name}
        Target Customer: {target_customer}
        Search Data: {search_data}
        
        Provide a JSON object with:
        - "tam": "Total Addressable Market (e.g. $10B)",
        - "sam": "Serviceable Addressable Market",
        - "som": "Serviceable Obtainable Market (Year 1-3 goal)",
        - "growth_rate": "CAGR or industry growth percentage",
        - "economist_verdict": "2 sentence summary on market attractiveness"
        
        Return ONLY valid JSON.
        """,
        input_variables=["problem_name", "target_customer", "search_data"]
    )
    
    try:
        chain = prompt | llm | JsonOutputParser()
        analysis = chain.invoke({
            "problem_name": problem_name,
            "target_customer": target_cust,
            "search_data": "\n\n".join(stats_data)
        })
        return {"market_size_analysis": analysis}
    except Exception as e:
        print(f"Economist Analysis Error: {e}")
        return {"market_size_analysis": {"tam": "Unknown", "sam": "Unknown", "som": "Unknown", "growth_rate": "N/A", "economist_verdict": str(e)}}

def designer_node(state: IdeaRadarState):
    blueprint = state.get('blueprint', {})
    problem_name = state.get('selected_problem', {}).get('problem_name', 'Software')
    mvp = blueprint.get('mvp_blueprint', {})
    
    print(f"Designer Node: Generating visual mockup for '{problem_name}'...")
    
    # Construct a descriptive prompt for the AI image generator
    features = [v.get('name', '') for k, v in mvp.items() if isinstance(v, dict)]
    feature_str = ", ".join(features)
    
    base_prompt = f"Professional clean UI UX design for {problem_name}, a software product featuring {feature_str}. High resolution, modern aesthetic, dark mode, dashboard layout, 4k, tech startup style."
    encoded_prompt = urllib.parse.quote(base_prompt)
    mockup_url = f"https://image.pollinations.ai/prompt/{encoded_prompt}?width=1024&height=768&nologo=true"
    
    return {"mockup_url": mockup_url}

def critic_node(state: IdeaRadarState):
    selected_problem = state.get('selected_problem', {})
    problem_name = selected_problem.get('problem_name', 'Unknown')
    blueprint = state.get('blueprint', {})
    
    print(f"Critic Node: Stress-testing '{problem_name}'...")
    
    ollama_url = os.environ.get("OLLAMA_BASE_URL", "http://localhost:11434")
    llm = ChatOllama(model="nemotron-3-nano:30b-cloud", base_url=ollama_url, format="json", temperature=0.8)

    prompt = PromptTemplate(
        template="""You are a cynical "Red Team" VC Critic. 
        Your job is to find exactly why this business idea will FAIL. 
        Be brutal but objective.
        
        Idea: {problem_name}
        Blueprint: {blueprint}
        
        Provide a JSON object with:
        - "technical_risk": "Biggest technical hurdle",
        - "market_risk": "Why users might not switch from current habits",
        - "legal_risk": "Potential regulatory or IP blockers",
        - "kill_switch_criteria": "A specific metric or event that means the founder should QUIT this idea",
        - "survival_strategy": "1 sentence on how to mitigate the biggest risk"
        
        Return ONLY valid JSON.
        """,
        input_variables=["problem_name", "blueprint"]
    )
    
    try:
        chain = prompt | llm | JsonOutputParser()
        analysis = chain.invoke({
            "problem_name": problem_name,
            "blueprint": json.dumps(blueprint)
        })
        return {"risk_assessment": analysis}
    except Exception as e:
        print(f"Critic Analysis Error: {e}")
        return {"risk_assessment": {"technical_risk": "Unknown", "market_risk": "Unknown", "legal_risk": "N/A", "kill_switch_criteria": "N/A", "survival_strategy": str(e)}}

def orchestrator_node(state: IdeaRadarState):
    print("Orchestrator Node: Evaluating workflow state...")
    raw_data  = state.get("raw_data", [])
    research  = state.get("research_notes", [])
    reasoning = state.get("reasoning_log", "")
    problems  = state.get("identified_problems", [])
    selected  = state.get("selected_problem", {})
    blueprint = state.get("blueprint", None)
    market    = state.get("market_size_analysis", None)
    mockup    = state.get("mockup_url", None)
    risk      = state.get("risk_assessment", None)
    need_more = state.get("need_more_research", False)
    rounds    = state.get("research_rounds", 0)

    if not raw_data:
        return {"next_agent": "scout"}
    
    # Loop back to research if quality was low and we haven't looped too much
    if need_more and rounds < 2:
        print("Orchestrator: Low quality research detected. Triggering Round 2...")
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

    return {"next_agent": "END"}

def ask_human_node(state: IdeaRadarState):
    print("Human Node: Paused for human input.")
    return {}

def route_from_orchestrator(state: IdeaRadarState):
    next_agent = state.get("next_agent", "END")
    if next_agent == "END":
        return END
    return next_agent

# Define the graph
workflow = StateGraph(IdeaRadarState)

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

workflow.set_entry_point("orchestrator")

workflow.add_conditional_edges("orchestrator", route_from_orchestrator)
workflow.add_edge("scout", "orchestrator")
workflow.add_edge("researcher", "orchestrator")
workflow.add_edge("reasoner", "orchestrator")
workflow.add_edge("analyst", "orchestrator")
workflow.add_edge("ask_human", "orchestrator")
workflow.add_edge("strategist", "orchestrator")
workflow.add_edge("economist", "orchestrator")
workflow.add_edge("designer", "orchestrator")
workflow.add_edge("critic", "orchestrator")

# Use MemorySaver for checkpoints to allow pausing
memory = MemorySaver()
app = workflow.compile(checkpointer=memory, interrupt_before=["ask_human"])

if __name__ == "__main__":
    # Test pass-through manually
    config = {"configurable": {"thread_id": "test_thread"}}
    initial_state = {"topic": "Remote Team Management"}
    print("Starting IdeaRadar Pipeline...")
    
    # Run until interrupt
    for event in app.stream(initial_state, config=config):
        print(event)
        
    # Inject a human selection
    print("\n--- Injecting Human Selection ---")
    app.update_state(config, {"selected_problem": {"problem_name": "Test Prob", "sentiment": "bad", "market_score": 90}})
    
    # Resume
    for event in app.stream(None, config=config):
        print(event)
