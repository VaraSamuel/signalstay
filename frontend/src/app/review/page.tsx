"use client";

import { useEffect, useMemo, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Api } from "@/lib/api";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import ExpediaHeader from "@/components/ExpediaHeader";

type PromptPlan = {
  attribute_key: string;
  attribute_label: string;
  question: string;
  why_this_question: string;
  uncertainty_reduced: string;
  inferred_property_type?: string | null;
  signal_strength?: number | null;
  step: number;
  source?: string | null;
};

type PropertySummary = {
  id: string;
  name: string;
  city: string;
  province?: string | null;
  country: string;
  thumbnail_url?: string | null;
  star_rating?: number | null;
  trust_score?: number;
  current_confidence?: number;
  current_freshness?: number;
  stale_hint?: string | null;
};

type AttributeScore = {
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
};

type ReviewStartResponse = {
  session_id: string;
  property: PropertySummary;
  first_prompt: PromptPlan;
  attribute_scores: AttributeScore[];
  overall_confidence: number;
  overall_freshness: number;
  overall_trust_score: number;
};

type ReviewSubmitResponse = {
  session_id: string;
  completed: boolean;
  next_prompt?: PromptPlan | null;
  dashboard?: unknown;
  attribute_scores: AttributeScore[];
};

type ImprovePromptResponse = {
  property_id: string;
  prompt: PromptPlan;
};

function statusPill(status: "weak" | "medium" | "strong") {
  if (status === "strong") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (status === "medium") return "bg-amber-50 text-amber-700 border-amber-200";
  return "bg-rose-50 text-rose-700 border-rose-200";
}

function getTopWeakSignals(scores: AttributeScore[]) {
  return [...scores]
    .sort((a, b) => {
      const aw = (100 - a.confidence_score) + (100 - a.freshness_score);
      const bw = (100 - b.confidence_score) + (100 - b.freshness_score);
      return bw - aw;
    })
    .slice(0, 4);
}

function ReviewPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const propertyId = searchParams.get("propertyId") || "";
  const sessionIdFromUrl = searchParams.get("sessionId") || "";
  const mode = searchParams.get("mode") || "normal";

  const [sessionId, setSessionId] = useState(sessionIdFromUrl);
  const [property, setProperty] = useState<PropertySummary | null>(null);
  const [prompt, setPrompt] = useState<PromptPlan | null>(null);
  const [scores, setScores] = useState<AttributeScore[]>([]);
  const [step, setStep] = useState<number>(1);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const { transcript, isListening,  startListening, stopListening } = useSpeechRecognition();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lastTranscriptRef = useRef<string>("");

  // Auto-append voice transcript to answer (only append new content)
  useEffect(() => {
    if (transcript && transcript !== lastTranscriptRef.current) {
      setAnswer((prev) => {
        const combined = prev ? prev + " " + transcript : transcript;
        return combined.trim();
      });
      lastTranscriptRef.current = transcript;
      
    }
  }, [transcript]);

  const weakSignals = useMemo(() => getTopWeakSignals(scores), [scores]);

  useEffect(() => {
    let cancelled = false;

    async function boot() {
      if (!propertyId) {
        setError("Missing propertyId in the URL.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        let activeSessionId = sessionIdFromUrl;

        if (!activeSessionId && typeof window !== "undefined") {
          const storedPropId = localStorage.getItem("signalstay_property_id");
          const storedSessId = localStorage.getItem("signalstay_session_id");
          if (storedPropId === propertyId && storedSessId) {
            activeSessionId = storedSessId;
          }
        }

        if (mode === "improve" && activeSessionId) {
          try {
            const [session, improve]: [ReviewStartResponse, ImprovePromptResponse] =
              await Promise.all([
                Api.getReviewSession(activeSessionId) as Promise<ReviewStartResponse>,
                Api.getImprovePrompt(propertyId, activeSessionId) as Promise<ImprovePromptResponse>,
              ]);
            if (cancelled) return;
            setSessionId(session.session_id);
            setProperty(session.property);
            setScores(session.attribute_scores || []);
            setPrompt(improve.prompt);
            setStep(improve.prompt?.step || 3);
            localStorage.setItem("signalstay_session_id", session.session_id);
            localStorage.setItem("signalstay_property_id", propertyId);
            setLoading(false);
            return;
          } catch (err: unknown) {
            // If session not found, just proceed without it
            const errMsg = err instanceof Error ? err.message : "";
            if (errMsg.includes("404") || errMsg.includes("session not found")) {
              localStorage.removeItem("signalstay_session_id");
              localStorage.removeItem("signalstay_property_id");
              // Fall through to start new review
            } else {
              throw err;
            }
          }
        }

        if (activeSessionId) {
          try {
            const existing = await Api.getReviewSession(activeSessionId) as ReviewStartResponse;
            if (cancelled) return;
            setSessionId(existing.session_id);
            setProperty(existing.property);
            setScores(existing.attribute_scores || []);
            setPrompt(existing.first_prompt);
            setStep(existing.first_prompt?.step || 1);
            localStorage.setItem("signalstay_session_id", existing.session_id);
            localStorage.setItem("signalstay_property_id", propertyId);
            setLoading(false);
            return;
          } catch (err: unknown) {
            // If session not found (404), clear localStorage and start fresh
            const errMsg = err instanceof Error ? err.message : "";
            if (errMsg.includes("404") || errMsg.includes("session not found")) {
              localStorage.removeItem("signalstay_session_id");
              localStorage.removeItem("signalstay_property_id");
              // Fall through to start a new review
            } else {
              throw err;
            }
          }
        }

        const started = await Api.startReview(propertyId) as ReviewStartResponse;
        if (cancelled) return;
        setSessionId(started.session_id);
        setProperty(started.property);
        setScores(started.attribute_scores || []);
        setPrompt(started.first_prompt);
        setStep(started.first_prompt?.step || 1);
        localStorage.setItem("signalstay_session_id", started.session_id);
        localStorage.setItem("signalstay_property_id", propertyId);
        router.replace(
          `/review?propertyId=${encodeURIComponent(propertyId)}&sessionId=${encodeURIComponent(started.session_id)}`
        );
      } catch (e: unknown) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Failed to load review flow.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    boot();
    return () => { cancelled = true; };
  }, [propertyId, sessionIdFromUrl, mode, router]);

  async function handleSubmit() {
    if (!propertyId || !sessionId || !prompt || !answer.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const result = await Api.submitReview(propertyId, {
        session_id: sessionId,
        step,
        answer: answer.trim(),
      }) as ReviewSubmitResponse;

      setScores(result.attribute_scores || []);
      setAnswer("");
      localStorage.setItem("signalstay_session_id", sessionId);
      localStorage.setItem("signalstay_property_id", propertyId);

      if (result.completed) {
        router.push(
          `/dashboard?propertyId=${encodeURIComponent(propertyId)}&sessionId=${encodeURIComponent(sessionId)}`
        );
        return;
      }
      if (result.next_prompt) {
        setPrompt(result.next_prompt);
        setStep(result.next_prompt.step || step + 1);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#F5F8FC]">
        <ExpediaHeader />
        <div className="mx-auto max-w-6xl px-6 py-10">
          <div className="animate-pulse rounded-3xl border border-slate-200 bg-white p-6">
            <div className="h-7 w-52 rounded bg-slate-200" />
            <div className="mt-3 h-4 w-36 rounded bg-slate-100" />
            <div className="mt-8 grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
              <div className="h-[460px] rounded-3xl bg-slate-100" />
              <div className="h-[460px] rounded-3xl bg-slate-100" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-[#F5F8FC]">
        <ExpediaHeader />
        <div className="mx-auto max-w-4xl px-6 py-10">
          <button onClick={() => router.push("/")} className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
            ← Back to properties
          </button>
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700">{error}</div>
        </div>
      </main>
    );
  }

  if (!property || !prompt) {
    return (
      <main className="min-h-screen bg-[#F5F8FC]">
        <ExpediaHeader />
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="rounded-3xl border border-slate-200 bg-white p-6">No review session available.</div>
        </div>
      </main>
    );
  }

  const isImproveMode = mode === "improve";
  const totalSteps = isImproveMode ? 1 : 2;

  return (
    <main className="min-h-screen bg-[#F5F8FC]">
      <ExpediaHeader />

      <div className="mx-auto max-w-6xl px-6 py-8">
        {/* Back */}
        <button
          onClick={() => router.push("/")}
          className="mb-6 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          ← Back to properties
        </button>

        {/* Progress indicator */}
        {!isImproveMode && (
          <div className="mb-6 flex items-center gap-3">
            {[1, 2].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold ${
                  step >= s ? "bg-[#0A438B] text-white" : "bg-slate-200 text-slate-500"
                }`}>
                  {step > s ? "✓" : s}
                </div>
                <span className={`text-sm ${step >= s ? "font-semibold text-[#0A438B]" : "text-slate-400"}`}>
                  {s === 1 ? "Most stale signal" : "Weakest remaining signal"}
                </span>
                {s < totalSteps && <div className="h-0.5 w-8 bg-slate-200" />}
              </div>
            ))}
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          {/* Main card */}
          <section className="rounded-[28px] border border-slate-200 bg-white shadow-sm overflow-hidden">
            {property.thumbnail_url && (
              <div className="relative h-56">
                <img src={property.thumbnail_url} alt={property.name} className="h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-4 left-5 text-white">
                  <div className="text-2xl font-extrabold leading-tight">{property.name}</div>
                  <div className="text-sm opacity-80 mt-0.5">{property.city}, {property.country}</div>
                </div>
                {property.trust_score !== undefined && (
                  <div className="absolute top-4 right-4 rounded-xl bg-white/95 px-3 py-1.5 text-sm font-extrabold text-[#0A438B] shadow">
                    {property.trust_score.toFixed(1)}/10 trust
                  </div>
                )}
              </div>
            )}

            <div className="p-6">
              {/* Question attribution */}
              <div className="flex flex-wrap items-center gap-2 mb-5">
                <span className="rounded-full bg-[#0A438B] px-3 py-1 text-xs font-bold text-white">
                  {isImproveMode ? "Weakest signal" : step === 1 ? "Most stale signal" : "Weakest remaining"}
                </span>
                <span className="rounded-full bg-[#FFF8E1] text-[#B45309] border border-[#FDE68A] px-3 py-1 text-xs font-semibold">
                  Targeting: {prompt.attribute_label}
                </span>
                {prompt.source === "ai" && (
                  <span className="rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 text-xs font-semibold">
                    AI generated
                  </span>
                )}
              </div>

              {/* The question — big and prominent */}
              <div className="rounded-2xl bg-gradient-to-br from-[#F0F6FF] to-[#E8F1FF] border border-[#C7DCFF] p-6 mb-5">
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#0A438B]/60 mb-3">
                  Best next question for this property
                </div>
                <p className="text-xl font-bold leading-snug text-[#0A438B]">
                  {prompt.question}
                </p>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl bg-white/80 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Why this question</div>
                    <p className="mt-1 text-xs leading-5 text-slate-700">{prompt.why_this_question}</p>
                  </div>
                  <div className="rounded-xl bg-white/80 p-3">
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">What this clarifies</div>
                    <p className="mt-1 text-xs leading-5 text-slate-700">{prompt.uncertainty_reduced}</p>
                  </div>
                </div>
              </div>

              {/* Answer box */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-bold text-slate-800">Your answer</label>
                  {(
                    <button
                      onClick={isListening ? stopListening : startListening}
                      className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition ${
                        isListening
                          ? "bg-red-100 text-red-700 hover:bg-red-200"
                          : "bg-blue-100 text-[#0A438B] hover:bg-blue-200"
                      }`}
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                        <path d="M17 16.91c-1.48 1.46-3.51 2.36-5.77 2.36-2.26 0-4.29-.9-5.77-2.36l-1.1 1.1c1.86 1.86 4.41 3 7.07 3s5.21-1.14 7.07-3l-1.1-1.1zM12 20c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1s-1 .45-1 1v3c0 .55.45 1 1 1z"/>
                      </svg>
                      {isListening ? "Stop listening..." : "Use voice"}
                    </button>
                  )}
                </div>
                <textarea
                  ref={textareaRef}
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && answer.trim()) handleSubmit();
                  }}
                  className={`mt-2 min-h-[130px] w-full rounded-2xl border p-4 text-sm outline-none transition ${
                    isListening
                      ? "border-red-400 bg-red-50 text-slate-800 ring-4 ring-red-100"
                      : "border-slate-200 text-slate-800 focus:border-[#0A438B] focus:ring-4 focus:ring-[#0A438B]/10"
                  }`}
                  placeholder="Share one concrete detail from your stay. What worked, what didn't, anything recent guests should know. Or use the voice button."
                />
                {isListening && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className="h-1 w-1 rounded-full bg-red-500 animate-pulse"
                          style={{ animationDelay: `${i * 0.1}s` }}
                        />
                      ))}
                    </div>
                    <span className="font-semibold">Listening...</span>
                  </div>
                )}
                {error && <p className="mt-2 text-xs text-rose-600">{error}</p>}
                <div className="mt-4 flex items-center justify-between gap-3">
                  <p className="text-xs text-slate-400">
                    {isImproveMode
                      ? "This directly improves the weakest signal in the property trust profile."
                      : step === 1
                      ? "Step 1 of 2 · Targeting the highest-impact stale signal."
                      : "Final step · Your answer updates the live property dashboard."}
                    <span className="ml-1 opacity-60">⌘↵ to submit</span>
                  </p>
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !answer.trim()}
                    className="rounded-2xl bg-[#0A438B] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[#083470] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {submitting
                      ? "Submitting..."
                      : step === 1 && !isImproveMode
                      ? "Continue →"
                      : "Update dashboard →"}
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* Sidebar */}
          <aside className="space-y-5">
            {/* Weak signals panel */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-4">
                Weakest signals
              </div>
              <div className="space-y-2.5">
                {weakSignals.map((item) => (
                  <div
                    key={item.key}
                    className={`rounded-2xl border p-3 ${
                      item.key === prompt.attribute_key
                        ? "border-[#0A438B] bg-[#F0F6FF]"
                        : "border-slate-200 bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <div className="text-sm font-bold text-slate-900">{item.label}</div>
                        <div className="flex gap-3 mt-1 text-[11px] text-slate-400">
                          <span>Conf {item.confidence_score.toFixed(0)}</span>
                          <span>Fresh {item.freshness_score.toFixed(0)}</span>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusPill(item.status)}`}>
                          {item.status}
                        </span>
                        {item.key === prompt.attribute_key && (
                          <span className="text-[10px] font-bold text-[#0A438B]">← asking now</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Why this works */}
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">
                Why this works
              </div>
              <ul className="space-y-2 text-sm text-slate-600 leading-6">
                <li className="flex gap-2"><span className="text-[#0A438B] font-bold">→</span> No blank review box</li>
                <li className="flex gap-2"><span className="text-[#0A438B] font-bold">→</span> Question 1 targets the stalest signal</li>
                <li className="flex gap-2"><span className="text-[#0A438B] font-bold">→</span> Question 2 targets the weakest remaining</li>
                <li className="flex gap-2"><span className="text-[#0A438B] font-bold">→</span> Dashboard updates live after each answer</li>
              </ul>
            </div>

            {property.stale_hint && (
              <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-2">
                  Property context
                </div>
                <p className="text-sm leading-6 text-slate-600">{property.stale_hint}</p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function ReviewPage() {
  return (
    <Suspense fallback={<div className="p-10">Loading...</div>}>
      <ReviewPageInner />
    </Suspense>
  );
}
