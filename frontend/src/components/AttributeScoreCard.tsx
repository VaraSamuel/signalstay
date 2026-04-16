"use client";

import type { AttributeScore } from "@/lib/types";

type Props = {
  attribute: AttributeScore;
};

export default function AttributeScoreCard({ attribute }: Props) {
  const chipStyles =
    attribute.status === "strong"
      ? "bg-emerald-100 text-emerald-700"
      : attribute.status === "medium"
      ? "bg-amber-100 text-amber-700"
      : "bg-rose-100 text-rose-700";

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-wide text-slate-500">
            {attribute.category}
          </div>
          <h3 className="text-lg font-semibold text-slate-900">
            {attribute.label}
          </h3>
        </div>

        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${chipStyles}`}>
          {attribute.status}
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-center">
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-xs text-slate-500">Value</div>
          <div className="text-lg font-semibold text-slate-900">
            {attribute.value_score.toFixed(1)}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-xs text-slate-500">Confidence</div>
          <div className="text-lg font-semibold text-slate-900">
            {attribute.confidence_score.toFixed(0)}
          </div>
        </div>
        <div className="rounded-2xl bg-slate-50 p-3">
          <div className="text-xs text-slate-500">Freshness</div>
          <div className="text-lg font-semibold text-slate-900">
            {attribute.freshness_score.toFixed(0)}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-slate-600">
        <span>Evidence count: {attribute.evidence_count}</span>
        <span>{attribute.stale ? "Still stale" : "Freshened"}</span>
      </div>

      {attribute.summary ? (
        <p className="mt-3 text-sm text-slate-600">{attribute.summary}</p>
      ) : null}
    </div>
  );
}