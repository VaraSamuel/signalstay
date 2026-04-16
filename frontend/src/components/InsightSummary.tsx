import type { AnalyzeReviewResponse, SubmitAnswerResponse } from "@/lib/types";

type Props = {
  analyzeData: AnalyzeReviewResponse | null;
  submitData: SubmitAnswerResponse | null;
};

export default function InsightSummary({ analyzeData, submitData }: Props) {
  return (
    <section className="glass-card rounded-[28px] p-6">
      <div className="mb-1 text-lg font-semibold text-slate-900">Insight summary</div>
      <div className="mb-5 text-sm leading-6 text-slate-600">
        A compact view of what the system learned and how it improved listing reliability.
      </div>

      {!analyzeData ? (
        <div className="rounded-2xl border border-black/10 bg-slate-50 p-4 text-sm text-slate-500">
          Analyze a review to surface missing or unreliable property topics.
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-black/10 bg-white/80 p-4">
            <div className="text-sm font-medium text-slate-700">Covered topics</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {analyzeData.covered_topics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-medium capitalize text-emerald-700"
                >
                  {topic}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-black/10 bg-white/80 p-4">
            <div className="text-sm font-medium text-slate-700">Selected unresolved topics</div>
            <div className="mt-3 flex flex-wrap gap-2">
              {analyzeData.selected_topics.map((topic) => (
                <span
                  key={topic}
                  className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-medium capitalize text-sky-700"
                >
                  {topic.replace(/_/g, " ")}
                </span>
              ))}
            </div>
          </div>

          {submitData ? (
            <>
              <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4">
                <div className="text-sm font-medium text-sky-900">Updated property narrative</div>
                <div className="mt-2 text-sm leading-7 text-slate-800">
                  {submitData.updated_summary}
                </div>
              </div>

              <div className="rounded-2xl border border-black/10 bg-white/80 p-4">
                <div className="text-sm font-medium text-slate-700">Impact</div>
                <div className="mt-2 text-sm leading-7 text-slate-800">
                  SignalStay updated{" "}
                  <span className="font-semibold text-sky-700">
                    {Object.entries(submitData.parsed_data).filter(
                      ([key, value]) =>
                        !["raw_text", "confidence"].includes(key) &&
                        value !== null &&
                        value !== undefined
                    ).length}
                  </span>{" "}
                  previously unreliable property attributes in real time.
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}
    </section>
  );
}