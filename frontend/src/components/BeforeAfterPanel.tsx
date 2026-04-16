type PropertyTruthRecord = any;

type Props = {
  record: PropertyTruthRecord | null;
};

function prettyStatus(status: string) {
  return status.replaceAll("_", " ");
}

export default function BeforeAfterPanel({ record }: Props) {
  if (!record) {
    return null;
  }

  const changes = Array.isArray(record.changes) ? record.changes : [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Before vs After</h3>
          <p className="text-sm text-slate-500">
            How the latest follow-up improved trust and confidence
          </p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Before
          </div>
          <div className="mt-2 space-y-2 text-sm text-slate-700">
            <div>
              Trust Score:{" "}
              <span className="font-semibold">{record.trustScoreBefore ?? "N/A"}</span>
            </div>
            <div>
              Confidence:{" "}
              <span className="font-semibold">{record.confidenceBefore ?? "N/A"}</span>
            </div>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            After
          </div>
          <div className="mt-2 space-y-2 text-sm text-slate-700">
            <div>
              Trust Score:{" "}
              <span className="font-semibold">{record.trustScoreAfter ?? "N/A"}</span>
            </div>
            <div>
              Confidence:{" "}
              <span className="font-semibold">{record.confidenceAfter ?? "N/A"}</span>
            </div>
          </div>
        </div>
      </div>

      {changes.length > 0 ? (
        <div className="mt-4">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
            Changed Signals
          </div>
          <div className="space-y-2">
            {changes.map((change: any, idx: number) => (
              <div
                key={`${change.field ?? "field"}-${idx}`}
                className="rounded-xl border border-slate-200 p-3"
              >
                <div className="text-sm font-medium text-slate-900">
                  {prettyStatus(String(change.field ?? "unknown"))}
                </div>
                <div className="mt-1 text-sm text-slate-600">
                  <span className="font-medium">Before:</span> {String(change.before ?? "N/A")}
                </div>
                <div className="text-sm text-slate-600">
                  <span className="font-medium">After:</span> {String(change.after ?? "N/A")}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
