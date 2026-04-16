"use client";

import type { PromptPlan } from "@/lib/types";

type Props = {
  prompt: PromptPlan;
};

export default function GuidedQuestionCard({ prompt }: Props) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[#0A438B]">
        Step {prompt.step} · Target attribute: {prompt.attribute_label}
      </div>

      <h2 className="text-2xl font-semibold text-slate-900">
        {prompt.question}
      </h2>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Why this question
          </div>
          <p className="mt-2 text-sm text-slate-700">
            {prompt.why_this_question}
          </p>
        </div>

        <div className="rounded-2xl bg-slate-50 p-4">
          <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Uncertainty reduced
          </div>
          <p className="mt-2 text-sm text-slate-700">
            {prompt.uncertainty_reduced}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        {prompt.inferred_property_type ? (
          <span className="rounded-full bg-[#FFF4CC] px-3 py-1 text-xs font-medium text-[#7A5A00]">
            Inferred property type: {prompt.inferred_property_type}
          </span>
        ) : null}

        {typeof prompt.signal_strength === "number" ? (
          <span className="rounded-full bg-[#E8F1FF] px-3 py-1 text-xs font-medium text-[#0A438B]">
            Signal opportunity: {prompt.signal_strength.toFixed(0)}
          </span>
        ) : null}
      </div>
    </div>
  );
}