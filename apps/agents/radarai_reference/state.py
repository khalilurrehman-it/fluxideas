from typing import TypedDict, List, Dict, Any, Optional

class IdeaRadarState(TypedDict):
    topic: str
    raw_data: List[str]
    raw_sources: List[Dict[str, str]]  # [{text, author, url, story_title, date}]
    research_notes: List[str]          # Deeper insights from Researcher
    reasoning_log: str                 # Chain-of-thought analysis from Reasoner
    market_size_analysis: Optional[Dict[str, Any]] # TAM/SAM/SOM from Economist
    mockup_url: Optional[str]          # URL for the visual MVP mockup
    risk_assessment: Optional[Dict[str, Any]] # Failure points from Critic
    founder_profile: Optional[Dict[str, str]] # Skills, budget, goals
    research_rounds: int               # Counter for self-correction
    need_more_research: bool           # Flag for the orchestrator
    identified_problems: List[Dict[str, Any]]
    selected_problem: Dict[str, Any]
    blueprint: Optional[Any]           # structured dict from Strategist
    next_agent: str
