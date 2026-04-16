type FollowUpQuestion = any;

type Props = {
  questions: FollowUpQuestion[];
};

export default function FollowUpQuestions({ questions }: Props) {
  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-base font-semibold text-slate-900">Follow-up Questions</h3>
        <p className="text-sm text-slate-500">
          Suggested next questions to improve trust and reduce uncertainty
        </p>
      </div>

      <div className="space-y-3">
        {questions.map((q: any, idx: number) => (
          <div key={idx} className="rounded-xl border border-slate-200 p-3">
            <div className="text-sm font-medium text-slate-900">
              {q.question ?? "Untitled question"}
            </div>

            {q.why_this_question ? (
              <div className="mt-1 text-sm text-slate-600">
                <span className="font-medium">Why this question:</span> {q.why_this_question}
              </div>
            ) : null}

            {q.uncertainty_reduced ? (
              <div className="mt-1 text-sm text-slate-600">
                <span className="font-medium">Uncertainty reduced:</span> {q.uncertainty_reduced}
              </div>
            ) : null}

            {q.inferred_property_type ? (
              <div className="mt-1 text-sm text-slate-600">
                <span className="font-medium">Property type:</span> {q.inferred_property_type}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </div>
  );
}
