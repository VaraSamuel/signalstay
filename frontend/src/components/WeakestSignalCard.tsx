"use client";

import { useRouter } from "next/navigation";
import type { PromptPlan } from "@/lib/types";

type Props = {
  propertyId: string;
  label: string;
  reason: string;
  prompt: PromptPlan;
};

export default function WeakestSignalCard({
  propertyId,
  label,
  reason,
  prompt,
}: Props) {
  const router = useRouter();

  function handleContributeMore() {
    if (typeof window !== "undefined") {
      sessionStorage.setItem(
        `improvePrompt:${propertyId}`,
        JSON.stringify(prompt)
      );
    }

    router.push(
      `/review?propertyId=${encodeURIComponent(propertyId)}&mode=improve`
    );
  }

  return (
    <div className="rounded-3xl border border-[#D8E6FF] bg-[#F7FAFF] p-6 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0A438B]">
        Weakest signal
      </div>

      <h3 className="mt-2 text-2xl font-semibold text-slate-900">{label}</h3>
      <p className="mt-2 text-sm text-slate-700">{reason}</p>

      <div className="mt-4 rounded-2xl bg-white p-4">
        <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Best next prompt
        </div>
        <p className="mt-2 text-sm text-slate-800">{prompt.question}</p>
      </div>

      <button
        onClick={handleContributeMore}
        className="mt-5 inline-flex rounded-2xl bg-[#0A438B] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#08356D]"
      >
        Contribute more
      </button>
    </div>
  );
}