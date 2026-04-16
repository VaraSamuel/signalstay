export type PropertySummary = {
  id: string;
  name: string;
  city: string;
  province?: string | null;
  country: string;
  area_description?: string | null;
  property_description?: string | null;
  star_rating?: number | null;
  thumbnail_url?: string | null;
  badges: string[];
  stale_hint?: string | null;
  current_confidence: number;
  current_freshness: number;
  trust_score: number;
};

export type AttributeScore = {
  key: string;
  label: string;
  category: string;
  weight: number;
  value_score: number;
  confidence_score: number;
  freshness_score: number;
  evidence_count: number;
  stale: boolean;
  status: "weak" | "medium" | "strong";
  last_updated?: string | null;
  summary?: string | null;
};

export type PromptPlan = {
  attribute_key: string;
  attribute_label: string;
  question: string;
  why_this_question: string;
  uncertainty_reduced: string;
  inferred_property_type?: string | null;
  signal_strength?: number | null;
  step: number;
};

export type ReviewStartResponse = {
  session_id: string;
  property: PropertySummary;
  first_prompt: PromptPlan;
  attribute_scores: AttributeScore[];
  overall_confidence: number;
  overall_freshness: number;
  overall_trust_score: number;
};

export type DashboardModel = {
  property: PropertySummary;
  overall_confidence: number;
  overall_freshness: number;
  overall_trust_score: number;
  confidence_delta: number;
  freshness_delta: number;
  trust_delta: number;
  weakest_attribute_key: string;
  weakest_attribute_label: string;
  weakest_attribute_reason: string;
  weakest_signal_prompt: PromptPlan;
  attribute_scores: AttributeScore[];
  before_after: Array<{
    key: string;
    label: string;
    before_confidence: number;
    after_confidence: number;
    before_freshness: number;
    after_freshness: number;
    before_value: number;
    after_value: number;
  }>;
  freshness_timeline: Array<{
    stage: string;
    confidence: number;
    freshness: number;
    trust_score: number;
  }>;
  insight_summary: string[];
};

export type ReviewSubmitResponse = {
  session_id: string;
  completed: boolean;
  next_prompt?: PromptPlan | null;
  dashboard?: DashboardModel | null;
  attribute_scores: AttributeScore[];
};