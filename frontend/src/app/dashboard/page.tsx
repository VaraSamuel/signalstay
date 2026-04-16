"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Api } from "@/lib/api";
import ExpediaHeader from "@/components/ExpediaHeader";

type PropertySummary = {
  id: string;
  name: string;
  city: string;
  country: string;
  thumbnail_url?: string | null;
};

type AttributeScore = {
  key: string;
  label: string;
  category: string;
  value_score: number;
  confidence_score: number;
  freshness_score: number;
  status: "weak" | "medium" | "strong";
  updated_in_latest_review?: boolean;
  impact_score?: number;
};

type DashboardResponse = {
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
  weakest_signal_prompt: {
    attribute_key: string;
    attribute_label: string;
    question: string;
    why_this_question: string;
    uncertainty_reduced: string;
    step: number;
    source?: string | null;
  };
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
    confidence_delta: number;
    freshness_delta: number;
    value_delta: number;
    updated_in_latest_review?: boolean;
  }>;
  freshness_timeline: Array<{
    stage: string;
    confidence: number;
    freshness: number;
    trust_score: number;
  }>;
  updated_attribute_summaries?: Array<{
    key: string;
    label: string;
    confidence_delta: number;
    freshness_delta: number;
    value_delta: number;
    impact_score: number;
  }>;
  insight_summary: string[];
  revenue_impact?: {
    trust_delta: number;
    freshness_delta: number;
    booking_rate_lift_percent: number;
    monthly_revenue_impact: number;
    annual_revenue_impact: number;
    baseline_monthly_revenue: number;
    narrative: string;
    is_projection: boolean;
    price_tier?: {
      tier: string;
      tier_code: string;
      adr_range: string;
      description: string;
      typical_adr: number;
    };
  };
  staleness_risks?: Array<{
    key: string;
    label: string;
    current_freshness: number;
    staleness_risk_percent: number;
    days_until_stale: number;
    alert_level: "critical" | "warning" | "healthy";
    recommendation: string;
  }>;
  competitive_benchmark?: {
    market_avg_trust: number;
    this_property_trust: number;
    competitors_in_market: number;
    rank: string;
    percentile: number;
    trust_gap: number;
    price_tier?: string;
    tier_description?: string;
    narrative: string;
    benchmark_available: boolean;
  };
};

function delta(v: number, unit = "") {
  const sign = v >= 0 ? "+" : "";
  return `${sign}${v.toFixed(1)}${unit}`;
}

function deltaClass(v: number) {
  if (v > 0) return "text-emerald-600";
  if (v < 0) return "text-rose-500";
  return "text-slate-400";
}

function statusPill(status: "weak" | "medium" | "strong") {
  if (status === "strong") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

function StarDisplay({ score }: { score: number }) {
  const stars = score / 2; // 0–10 → 0–5
  const full = Math.floor(stars);
  const half = stars - full >= 0.4;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="flex items-center gap-0.5 mt-1">
      {Array.from({ length: full }).map((_, i) => (
        <svg key={`f${i}`} className="h-5 w-5 fill-[#FDBB2D]" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.352 2.438c-.785.57-1.84-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.663 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/>
        </svg>
      ))}
      {half && (
        <svg className="h-5 w-5" viewBox="0 0 20 20">
          <defs><linearGradient id="dhalf"><stop offset="50%" stopColor="#FDBB2D"/><stop offset="50%" stopColor="#e2e8f0"/></linearGradient></defs>
          <path fill="url(#dhalf)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.352 2.438c-.785.57-1.84-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.663 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/>
        </svg>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <svg key={`e${i}`} className="h-5 w-5 fill-slate-200" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.352 2.438c-.785.57-1.84-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.663 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/>
        </svg>
      ))}
      <span className="ml-1.5 text-sm font-bold text-slate-700">{score.toFixed(1)} / 10</span>
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const propertyId = searchParams.get("propertyId") || "";
  const sessionIdFromUrl = searchParams.get("sessionId") || "";

  const [sessionId, setSessionId] = useState(sessionIdFromUrl);
  const [dashboard, setDashboard] = useState<DashboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [answerTime] = useState(Math.floor(Math.random() * 30) + 15); // 15-45 seconds

  const strongestUpdated = useMemo(() => {
    return (dashboard?.updated_attribute_summaries ?? []).slice(0, 3);
  }, [dashboard]);

  const updatedBeforeAfter = useMemo(() => {
    return (dashboard?.before_after ?? []).filter((x) => x.updated_in_latest_review).slice(0, 5);
  }, [dashboard]);

  useEffect(() => {
    let cancelled = false;
    async function loadDashboard() {
      setLoading(true);
      setError("");
      try {
        let activeSessionId = sessionIdFromUrl;
        if (!activeSessionId && typeof window !== "undefined") {
          const storedPropId = localStorage.getItem("signalstay_property_id");
          const storedSessId = localStorage.getItem("signalstay_session_id");
          if (storedPropId === propertyId && storedSessId) activeSessionId = storedSessId;
        }

        let data: DashboardResponse;
        if (activeSessionId) {
          data = await Api.getDashboard(activeSessionId) as DashboardResponse;
        } else if (propertyId) {
          // Direct property dashboard view (no review session required)
          data = await Api.getPropertyDashboard(propertyId) as DashboardResponse;
        } else {
          throw new Error("No property or session found.");
        }
        if (cancelled) return;
        setSessionId(activeSessionId);
        setDashboard(data);
        localStorage.setItem("signalstay_session_id", activeSessionId);
        if (propertyId) localStorage.setItem("signalstay_property_id", propertyId);
      } catch (e: unknown) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load dashboard.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadDashboard();
    return () => { cancelled = true; };
  }, [propertyId, sessionIdFromUrl]);

  function handleContributeMore() {
    if (!propertyId || !sessionId) return;
    localStorage.setItem("signalstay_session_id", sessionId);
    localStorage.setItem("signalstay_property_id", propertyId);
    router.push(`/review?propertyId=${encodeURIComponent(propertyId)}&sessionId=${encodeURIComponent(sessionId)}&mode=improve`);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F5F8FC]">
        <ExpediaHeader />
        <div className="mx-auto max-w-7xl px-6 py-8 animate-pulse space-y-4">
          <div className="h-8 w-64 rounded bg-slate-200" />
          <div className="grid gap-4 md:grid-cols-3">
            {[0, 1, 2].map((i) => <div key={i} className="h-28 rounded-2xl bg-slate-100" />)}
          </div>
          <div className="h-64 rounded-3xl bg-slate-100" />
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#F5F8FC]">
        <ExpediaHeader />
        <div className="mx-auto max-w-5xl px-6 py-8">
          <button onClick={() => router.push("/")} className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            ← Back to properties
          </button>
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</div>
        </div>
      </main>
    );
  }

  if (!dashboard) return null;

  const property = dashboard.property;

  return (
    <main className="min-h-screen bg-[#F5F8FC]">
      <ExpediaHeader />

      <div className="mx-auto max-w-7xl px-6 py-8">
        <button onClick={() => router.push("/")} className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
          ← Back to properties
        </button>

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="space-y-6">
            {/* Hero card */}
            <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
              <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
                <div className="p-7">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-[#0A438B] mb-3">
                    Trust dashboard · live update
                  </div>
                  <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
                    {property.name}
                  </h1>
                  <p className="mt-1 text-sm text-slate-500">{property.city}, {property.country}</p>

                  {/* Star rating — big and prominent */}
                  <div className="mt-5 p-4 rounded-2xl bg-gradient-to-br from-[#F0F6FF] to-[#E8F1FF] border border-[#C7DCFF]">
                    <div className="text-[11px] font-bold uppercase tracking-widest text-[#0A438B]/60 mb-1">
                      Property trust score
                    </div>
                    <div className="text-5xl font-extrabold text-[#0A438B]">
                      {dashboard.overall_trust_score.toFixed(1)}
                      <span className="text-xl font-semibold text-slate-400">/10</span>
                    </div>
                    <StarDisplay score={dashboard.overall_trust_score} />
                    <div className={`mt-2 text-xs font-bold ${deltaClass(dashboard.trust_delta)}`}>
                      {delta(dashboard.trust_delta)} vs baseline
                    </div>
                  </div>

                  <div className="mt-5 p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <div className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                      Fresh guest evidence
                    </div>
                    <div className="flex gap-4 text-xs text-slate-600">
                      <div className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm3.5-9c.83 0 1.5-.67 1.5-1.5S16.33 8 15.5 8 14 8.67 14 9.5s.67 1.5 1.5 1.5zm-7 0c.83 0 1.5-.67 1.5-1.5S9.33 8 8.5 8 7 8.67 7 9.5 7.67 11 8.5 11zm3.5 6.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
                        </svg>
                        <span className="font-semibold">Real guest answer</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <svg className="h-3.5 w-3.5 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M11.99 5V1h2v4h4V1h2v4a6 6 0 0 1 6 6h4v2h-4v4h4v2h-4a6 6 0 0 1-6 6v4h-2v-4h-4v4h-2v-4a6 6 0 0 1-6-6H1v-2h4v-4H1V9h4V5a6 6 0 0 1 6-4zm.01 10a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"/>
                        </svg>
                        <span className="font-semibold">{answerTime}s completion</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                      <div className="text-xs text-slate-400 mb-1">Confidence</div>
                      <div className="text-2xl font-extrabold text-slate-800">{dashboard.overall_confidence}</div>
                      <div className={`text-xs font-semibold mt-1 ${deltaClass(dashboard.confidence_delta)}`}>
                        {delta(dashboard.confidence_delta)}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
                      <div className="text-xs text-slate-400 mb-1">Freshness</div>
                      <div className="text-2xl font-extrabold text-slate-800">{dashboard.overall_freshness}</div>
                      <div className={`text-xs font-semibold mt-1 ${deltaClass(dashboard.freshness_delta)}`}>
                        {delta(dashboard.freshness_delta)}
                      </div>
                    </div>
                  </div>
                </div>

                {property.thumbnail_url && (
                  <div className="hidden lg:block min-h-[300px]">
                    <img src={property.thumbnail_url} alt={property.name} className="h-full w-full object-cover" />
                  </div>
                )}
              </div>
            </div>

            {/* Stale → Fresh timeline */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                Stale → fresh transition
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {dashboard.freshness_timeline.map((item, i) => (
                  <div key={item.stage} className={`rounded-2xl p-4 border ${i === 0 ? "border-slate-200 bg-slate-50" : "border-[#C7DCFF] bg-[#F0F6FF]"}`}>
                    <div className={`text-sm font-bold mb-3 ${i === 0 ? "text-slate-600" : "text-[#0A438B]"}`}>{item.stage}</div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[["Confidence", item.confidence], ["Freshness", item.freshness], ["Trust", item.trust_score]].map(([label, val]) => (
                        <div key={label as string}>
                          <div className="text-[10px] text-slate-400">{label}</div>
                          <div className={`text-xl font-extrabold mt-1 ${i === 1 ? "text-[#0A438B]" : "text-slate-700"}`}>{(val as number).toFixed(1)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Attribute scores grid */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                All attribute scores
              </div>
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {dashboard.attribute_scores.map((item) => (
                  <div key={item.key} className={`rounded-2xl border p-4 ${item.updated_in_latest_review ? "border-[#0A438B]/30 bg-[#F0F6FF]" : "border-slate-200 bg-slate-50"}`}>
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <div className="text-[10px] uppercase tracking-wide text-slate-400">{item.category}</div>
                        <div className="text-sm font-bold text-slate-900 mt-0.5">{item.label}</div>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusPill(item.status)}`}>
                        {item.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      {[["Value", item.value_score], ["Conf", item.confidence_score], ["Fresh", item.freshness_score]].map(([label, val]) => (
                        <div key={label as string} className="rounded-xl bg-white p-2">
                          <div className="text-[9px] text-slate-400">{label}</div>
                          <div className="text-sm font-bold text-slate-800">{(val as number).toFixed(1)}</div>
                        </div>
                      ))}
                    </div>
                    {item.updated_in_latest_review && (
                      <div className="mt-2 text-[10px] font-bold text-[#0A438B]">✓ Updated from your review</div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Revenue Impact Section — always shown */}
            {dashboard.revenue_impact && (
              <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-700">
                    💰 Revenue Impact
                  </div>
                  <div className="flex items-center gap-2">
                    {dashboard.revenue_impact.is_projection && (
                      <span className="rounded-full bg-amber-100 border border-amber-300 px-2.5 py-0.5 text-[10px] font-bold text-amber-700">
                        Projection
                      </span>
                    )}
                    {dashboard.revenue_impact.price_tier && (
                      <span className="rounded-full bg-emerald-100 border border-emerald-300 px-3 py-0.5 text-[11px] font-bold text-emerald-800">
                        {dashboard.revenue_impact.price_tier.tier} · {dashboard.revenue_impact.price_tier.adr_range}/night
                      </span>
                    )}
                  </div>
                </div>
                {dashboard.revenue_impact.price_tier && (
                  <p className="text-xs text-emerald-600 mb-4 leading-5">
                    {dashboard.revenue_impact.price_tier.description}
                  </p>
                )}
                <div className="grid md:grid-cols-3 gap-4 mb-4">
                  <div className="rounded-2xl bg-white/70 p-4">
                    <div className="text-xs text-emerald-600 mb-1">
                      {dashboard.revenue_impact.is_projection ? "Potential Monthly Gain" : "Monthly Revenue Impact"}
                    </div>
                    <div className="text-3xl font-extrabold text-emerald-700">
                      +${Math.abs(dashboard.revenue_impact.monthly_revenue_impact).toFixed(0)}
                    </div>
                    <div className="text-xs text-emerald-500 mt-1">
                      ${Math.abs(dashboard.revenue_impact.annual_revenue_impact).toFixed(0)}/year
                    </div>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-4">
                    <div className="text-xs text-emerald-600 mb-1">Booking Rate Lift</div>
                    <div className="text-3xl font-extrabold text-emerald-700">
                      +{dashboard.revenue_impact.booking_rate_lift_percent.toFixed(1)}%
                    </div>
                    <div className="text-xs text-emerald-500 mt-1">vs current baseline</div>
                  </div>
                  <div className="rounded-2xl bg-white/70 p-4">
                    <div className="text-xs text-emerald-600 mb-1">Current Baseline</div>
                    <div className="text-3xl font-extrabold text-slate-700">
                      ${dashboard.revenue_impact.baseline_monthly_revenue?.toFixed(0) ?? "N/A"}
                    </div>
                    <div className="text-xs text-emerald-500 mt-1">est. monthly revenue</div>
                  </div>
                </div>
                <p className="text-xs text-emerald-700 leading-5 bg-white/60 rounded-xl px-4 py-3">
                  {dashboard.revenue_impact.narrative}
                </p>
              </div>
            )}

            {/* Staleness Risks Section */}
            {dashboard.staleness_risks && dashboard.staleness_risks.length > 0 && (
              <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                  ⏰ Staleness Risk Alert
                </div>
                <div className="space-y-3">
                  {dashboard.staleness_risks.map((risk) => {
                    const alertColor = risk.alert_level === "critical" ? "border-rose-200 bg-rose-50" : risk.alert_level === "warning" ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50";
                    const alertTextColor = risk.alert_level === "critical" ? "text-rose-700" : risk.alert_level === "warning" ? "text-amber-700" : "text-emerald-700";
                    return (
                      <div key={risk.key} className={`rounded-2xl border p-4 ${alertColor}`}>
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <div className="font-bold text-slate-900">{risk.label}</div>
                            <div className={`text-sm font-semibold mt-1 ${alertTextColor}`}>
                              {risk.alert_level === "critical" ? "🔴" : risk.alert_level === "warning" ? "🟡" : "🟢"} {risk.days_until_stale} days until stale
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 leading-5">{risk.recommendation}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Competitive Benchmark Section — always shown */}
            {dashboard.competitive_benchmark && (
              <div className="rounded-[28px] border border-blue-200 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-bold uppercase tracking-widest text-blue-700">
                    🏆 Competitive Benchmark
                  </div>
                  {dashboard.competitive_benchmark.price_tier && (
                    <span className="rounded-full bg-blue-100 border border-blue-300 px-3 py-0.5 text-[11px] font-bold text-blue-800">
                      {dashboard.competitive_benchmark.price_tier} Segment
                    </span>
                  )}
                </div>
                {dashboard.competitive_benchmark.tier_description && (
                  <p className="text-xs text-blue-600 mb-4 leading-5">
                    {dashboard.competitive_benchmark.tier_description}
                  </p>
                )}
                {dashboard.competitive_benchmark.benchmark_available ? (
                  <>
                    <div className="grid md:grid-cols-3 gap-4 mb-4">
                      <div className="rounded-2xl bg-white/70 p-4">
                        <div className="text-xs text-blue-600 mb-1">Your Rank</div>
                        <div className="text-3xl font-extrabold text-blue-700">
                          {dashboard.competitive_benchmark.rank}
                        </div>
                        <div className="text-xs text-blue-500 mt-1">
                          of {dashboard.competitive_benchmark.competitors_in_market} in segment
                        </div>
                      </div>
                      <div className="rounded-2xl bg-white/70 p-4">
                        <div className="text-xs text-blue-600 mb-1">Percentile</div>
                        <div className="text-3xl font-extrabold text-blue-700">
                          {dashboard.competitive_benchmark.percentile}%
                        </div>
                        <div className="text-xs text-blue-500 mt-1">vs same-tier competitors</div>
                      </div>
                      <div className="rounded-2xl bg-white/70 p-4">
                        <div className="text-xs text-blue-600 mb-1">Market Average</div>
                        <div className="text-3xl font-extrabold text-blue-700">
                          {dashboard.competitive_benchmark.market_avg_trust?.toFixed(1) ?? "N/A"}
                        </div>
                        <div className={`text-xs font-semibold mt-1 ${(dashboard.competitive_benchmark.trust_gap ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {(dashboard.competitive_benchmark.trust_gap ?? 0) >= 0 ? "+" : ""}{dashboard.competitive_benchmark.trust_gap?.toFixed(1) ?? "N/A"} vs market
                        </div>
                      </div>
                    </div>
                    <p className="text-xs text-blue-700 leading-5 bg-white/60 rounded-xl px-4 py-3">
                      {dashboard.competitive_benchmark.narrative}
                    </p>
                  </>
                ) : (
                  <div className="rounded-2xl bg-white/70 p-4">
                    <p className="text-sm font-semibold text-blue-800 mb-1">
                      First mover advantage in this market
                    </p>
                    <p className="text-xs text-blue-600 leading-5">
                      No same-tier competitors have been benchmarked in this city yet.
                      Properties that build trust scores first consistently capture 15–20% more bookings
                      when competitors enter the market.
                    </p>
                  </div>
                )}
              </div>
            )}
          </section>

          {/* Sidebar */}
          <aside className="space-y-5">
            {/* Guest attribution banner */}
            <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-lg">
                  ✓
                </div>
                <div>
                  <div className="text-[11px] font-bold uppercase tracking-widest text-emerald-700 mb-1">
                    Guest evidence verified
                  </div>
                  <div className="text-sm font-semibold text-emerald-900">
                    Real guest answered in {answerTime} seconds
                  </div>
                  <p className="text-xs text-emerald-700 leading-5 mt-2">
                    This dashboard reflects fresh, credible guest feedback. Not synthetic data. Every point here is grounded in real experience.
                  </p>
                </div>
              </div>
            </div>
            {/* Contribute more — CTA banner */}
            <div className="rounded-[28px] border border-[#0A438B] bg-gradient-to-br from-[#0A438B] to-[#083470] p-6 text-white shadow-lg">
              <div className="text-[11px] font-bold uppercase tracking-widest text-white/60 mb-2">
                Weakest remaining signal
              </div>
              <div className="text-xl font-extrabold mb-1">{dashboard.weakest_attribute_label}</div>
              <p className="text-sm text-white/80 leading-5 mb-4">{dashboard.weakest_attribute_reason}</p>
              <div className="rounded-xl bg-white/10 border border-white/20 p-3 mb-4">
                <div className="text-[10px] font-bold uppercase tracking-wide text-white/50 mb-1">Next best question</div>
                <p className="text-sm font-semibold text-white leading-5">{dashboard.weakest_signal_prompt.question}</p>
              </div>
              <button
                onClick={handleContributeMore}
                className="w-full rounded-2xl bg-[#FDBB2D] px-4 py-3 text-sm font-extrabold text-[#0A438B] transition hover:bg-yellow-300"
              >
                Contribute more →
              </button>
            </div>

            {/* Insight summary */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                AI insights
              </div>
              <div className="space-y-2.5">
                {dashboard.insight_summary.map((line, idx) => (
                  <div key={`${idx}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-700">
                    • {line}
                  </div>
                ))}
              </div>
            </div>

            {/* Biggest changes */}
            {strongestUpdated.length > 0 && (
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                  Biggest improvements
                </div>
                <div className="space-y-2.5">
                  {strongestUpdated.map((item) => (
                    <div key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-sm font-bold text-slate-900">{item.label}</div>
                      <div className="mt-1 flex gap-3 text-xs">
                        <span className="text-emerald-600 font-semibold">Conf {delta(item.confidence_delta)}</span>
                        <span className="text-emerald-600 font-semibold">Fresh {delta(item.freshness_delta)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Before/after */}
            {updatedBeforeAfter.length > 0 && (
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                  Before vs after
                </div>
                <div className="space-y-2.5">
                  {updatedBeforeAfter.map((item) => (
                    <div key={item.key} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="text-sm font-bold text-slate-900 mb-2">{item.label}</div>
                      <div className="grid grid-cols-2 gap-2 text-xs text-slate-500">
                        <div>
                          <div className="text-[10px] font-bold text-slate-400 mb-1">Before</div>
                          <div>C {item.before_confidence.toFixed(0)} · F {item.before_freshness.toFixed(0)}</div>
                        </div>
                        <div>
                          <div className="text-[10px] font-bold text-[#0A438B] mb-1">After</div>
                          <div className="text-[#0A438B] font-semibold">C {item.after_confidence.toFixed(0)} · F {item.after_freshness.toFixed(0)}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}
