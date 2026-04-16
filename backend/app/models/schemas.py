from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


class PropertySummary(BaseModel):
    id: str
    name: str
    city: str
    province: Optional[str] = None
    country: str
    area_description: Optional[str] = None
    property_description: Optional[str] = None
    star_rating: Optional[float] = None
    thumbnail_url: Optional[str] = None
    badges: List[str] = Field(default_factory=list)
    stale_hint: Optional[str] = None
    current_confidence: float = 0.0
    current_freshness: float = 0.0
    trust_score: float = 0.0
    review_count: int = 0
    avg_review_rating: Optional[float] = None
    latest_review_date: Optional[str] = None


class AttributeScore(BaseModel):
    key: str
    label: str
    category: str
    weight: float
    value_score: float
    confidence_score: float
    freshness_score: float
    evidence_count: int
    stale: bool
    status: Literal["weak", "medium", "strong"]
    last_updated: Optional[str] = None
    summary: Optional[str] = None
    updated_in_latest_review: bool = False
    impact_score: float = 0.0


class PromptPlan(BaseModel):
    attribute_key: str
    attribute_label: str
    question: str
    why_this_question: str
    uncertainty_reduced: str
    inferred_property_type: Optional[str] = None
    signal_strength: Optional[float] = None
    step: int
    source: Optional[str] = None


class ReviewStartResponse(BaseModel):
    session_id: str
    property: PropertySummary
    first_prompt: PromptPlan
    attribute_scores: List[AttributeScore]
    overall_confidence: float
    overall_freshness: float
    overall_trust_score: float


class SubmitReviewRequest(BaseModel):
    session_id: str
    step: int
    answer: str


class ReviewSubmitResponse(BaseModel):
    session_id: str
    completed: bool
    next_prompt: Optional[PromptPlan] = None
    dashboard: Optional[Dict[str, Any]] = None
    attribute_scores: List[AttributeScore]


class ImprovePromptResponse(BaseModel):
    property_id: str
    prompt: PromptPlan


class DashboardResponse(BaseModel):
    property: PropertySummary
    overall_confidence: float
    overall_freshness: float
    overall_trust_score: float
    confidence_delta: float
    freshness_delta: float
    trust_delta: float
    weakest_attribute_key: str
    weakest_attribute_label: str
    weakest_attribute_reason: str
    weakest_signal_prompt: PromptPlan
    attribute_scores: List[AttributeScore]
    before_after: List[Dict[str, Any]]
    freshness_timeline: List[Dict[str, Any]]
    updated_attribute_summaries: List[Dict[str, Any]] = Field(default_factory=list)
    insight_summary: List[str]
    revenue_impact: Optional[Dict[str, Any]] = None
    staleness_risks: Optional[List[Dict[str, Any]]] = None
    competitive_benchmark: Optional[Dict[str, Any]] = None