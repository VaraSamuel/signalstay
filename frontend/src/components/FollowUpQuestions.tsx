import { FollowUpQuestion } from "@/lib/types";

type Props = {
  questions: FollowUpQuestion[];
};

export default function FollowUpQuestions({ questions }: Props) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="text-lg font-semibold text-slate-900">Selected follow-up questions</h3>
      <p className="mt-2 text-sm text-slate-500">
        These are the minimum high-value questions still needed.
      </p>

      <div className="mt-4 space-y-3">
        {questions.length === 0 ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
            No follow-up questions needed.
          </div>
        ) : (
          questions.map((question, index) => (
            <div
              key={`${question.attribute}-${index}`}
              className="rounded-xl border border-sky-200 bg-sky-50 p-4"
            >
              <div className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">
                Follow-up {index + 1}
              </div>
              <p className="mt-2 text-sm text-slate-900">{question.question}</p>
              <p className="mt-2 text-xs text-slate-500">{question.reason}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}