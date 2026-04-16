"use client";

import { useEffect, useState } from "react";
import ExpediaHeader from "@/components/ExpediaHeader";
import PropertyGrid from "@/components/PropertyGrid";
import { Api } from "@/lib/api";
import type { PropertySummary } from "@/lib/types";

export default function HomePage() {
  const [properties, setProperties] = useState<PropertySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadProperties = async () => {
    try {
      setLoading(true);
      const data = await Api.fetchProperties();
      setProperties(data as PropertySummary[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load properties");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProperties();
  }, []);

  // Refresh properties when page comes into focus (back from review)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadProperties();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, []);

  return (
    <main className="min-h-screen bg-[#F5F8FC]">
      <ExpediaHeader />

      {/* Hero — Expedia yellow gradient */}
      <section className="bg-gradient-to-br from-[#FDBB2D] via-[#F6C94A] to-[#FDBB2D] border-b border-yellow-300">
        <div className="mx-auto max-w-7xl px-6 py-14">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-8">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-sm font-semibold text-[#0A438B] mb-4">
                <span className="h-2 w-2 rounded-full bg-[#0A438B] animate-pulse" />
                Live · Wharton AI Hackathon 2025
              </div>
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight text-[#0A438B]">
                The right question,<br />
                <span className="text-white drop-shadow">at the right time.</span>
              </h1>
              <p className="mt-4 text-[#0A438B]/80 text-lg max-w-xl">
                Guest reviews are stale. Hotels lose 15-20% in potential trust from outdated signals. SignalStay asks the ONE question that closes each property's biggest gap. Instantly.
              </p>
            </div>

            {/* Stats strip */}
            <div className="flex gap-4 flex-wrap">
              {[
                { label: "Properties", value: loading ? "..." : String(properties.length) },
                { label: "Signals tracked", value: "15" },
                { label: "Max questions", value: "2" },
              ].map(({ label, value }) => (
                <div key={label} className="rounded-2xl bg-white/80 px-5 py-4 text-center min-w-[90px]">
                  <div className="text-3xl font-extrabold text-[#0A438B]">{value}</div>
                  <div className="text-xs font-medium text-slate-600 mt-1">{label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Problem vs Solution side-by-side */}
          <div className="mt-12 grid md:grid-cols-2 gap-6">
            <div className="rounded-2xl bg-white/60 backdrop-blur p-6 border border-white/40">
              <div className="text-xs font-bold uppercase tracking-widest text-red-600 mb-3">❌ The Problem</div>
              <h3 className="text-xl font-bold text-slate-800 mb-3">Blank Review Box</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <p>• Guest sees empty form</p>
                <p>• No clue what matters most</p>
                <p>• 70% drop-off rate</p>
                <p>• Random feedback, if any</p>
                <p>• Stale signals remain</p>
              </div>
            </div>

            <div className="rounded-2xl bg-white p-6 border-2 border-[#0A438B] shadow-lg">
              <div className="text-xs font-bold uppercase tracking-widest text-emerald-600 mb-3">✓ The SignalStay Way</div>
              <h3 className="text-xl font-bold text-[#0A438B] mb-3">One Smart Question</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <p>• AI detects exactly what's missing</p>
                <p>• Guests know why we ask</p>
                <p>• 28 seconds average completion</p>
                <p>• Targeted, credible feedback</p>
                <p>• Trust score improves live</p>
              </div>
              <div className="mt-4 p-3 rounded-lg bg-[#F0F6FF] border border-[#C7DCFF]">
                <p className="text-xs font-semibold text-[#0A438B]">Example question:</p>
                <p className="text-sm text-slate-700 mt-1">"How reliable was the Wi-Fi during your stay? Was it fast enough for work?"</p>
              </div>
            </div>
          </div>

          {/* How-it-works strip */}
          <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { step: "1", title: "Pick a property", desc: "Each card shows its live trust score" },
              { step: "2", title: "Get the best question", desc: "AI targets the stalest signal first" },
              { step: "3", title: "Answer in 30 seconds", desc: "One specific question, not a survey" },
              { step: "4", title: "Watch the dashboard update", desc: "Confidence & trust scores refresh live" },
            ].map(({ step, title, desc }) => (
              <div key={step} className="rounded-2xl bg-white/80 px-4 py-4">
                <div className="text-[11px] font-bold uppercase tracking-widest text-[#0A438B]/60 mb-2">Step {step}</div>
                <div className="text-sm font-bold text-[#0A438B]">{title}</div>
                <div className="text-xs text-slate-600 mt-1">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Property grid */}
      <section className="mx-auto max-w-7xl px-6 py-12">
        <div className="mb-8 flex items-end justify-between gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.2em] text-[#0A438B]">
              Properties
            </div>
            <h2 className="mt-1 text-3xl font-extrabold text-slate-900">
              Choose a property to improve
            </h2>
            <p className="mt-2 text-slate-500 text-sm">
              Click any card to get the highest-impact question instantly. No blank forms.
            </p>
          </div>
          {!loading && !error && (
            <div className="text-sm text-slate-500 shrink-0">
              {properties.length} properties loaded
            </div>
          )}
        </div>

        {loading ? (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse rounded-3xl border border-slate-200 bg-white overflow-hidden">
                <div className="h-52 bg-slate-200" />
                <div className="p-5 space-y-3">
                  <div className="h-4 w-3/4 rounded bg-slate-200" />
                  <div className="h-3 w-1/2 rounded bg-slate-100" />
                  <div className="h-16 rounded-xl bg-slate-100" />
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-3xl border border-rose-200 bg-rose-50 p-8 text-rose-700">
            {error}
          </div>
        ) : (
          <PropertyGrid properties={properties} />
        )}
      </section>
    </main>
  );
}
