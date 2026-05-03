from typing import TypedDict, List, Dict, Any, Optional


class IdeaRadarPipelineState(TypedDict):
    # Core inputs
    topic: str
    search_job_id: str
    nodejs_log_callback_url: str
    founder_profile: Optional[Dict[str, str]]  # {skills, budget, time}

    # Scraping phase
    raw_data: List[str]
    raw_sources: List[Dict[str, str]]  # [{text, author, url, story_title, date}]
    research_notes: List[str]
    research_rounds: int
    need_more_research: bool

    # Analysis phase
    reasoning_log: str
    identified_problems: List[Dict[str, Any]]

    # Deep dive phase (after human selection)
    selected_problem: Optional[Dict[str, Any]]
    blueprint: Optional[Dict[str, Any]]
    market_size_analysis: Optional[Dict[str, Any]]
    mockup_url: Optional[str]
    risk_assessment: Optional[Dict[str, Any]]

    # Report phase
    pdf_url: Optional[str]
    pptx_url: Optional[str]
    reporter_attempted: bool  # prevents infinite loop if reporter fails

    # Orchestrator routing
    next_agent: str
