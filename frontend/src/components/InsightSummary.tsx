type AnalyzeReviewResponse = any;
type SubmitAnswerResponse = any;

type Props = {
  analyzeData: AnalyzeReviewResponse | null;
  submitData?: SubmitAnswerResponse | null;
};

export default function InsightSummary({ analyzeData, submitData }: Props) {
  if (!analyzeData && !submitData) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <h3 className="text-base font-semibold text-slate-900 mb-2">
        Insight Summary
      </h3>

      {analyzeData ? (
        <div className="text-sm text-slate-600 mb-2">
          {JSON.stringify(analyzeData)}
        </div>
      ) : null}

      {submitData ? (
        <div className="text-sm text-slate-600">
          {JSON.stringify(submitData)}
        </div>
      ) : null}
    </div>
  );
}
