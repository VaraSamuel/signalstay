import { PropertyTruthRecord } from "@/lib/types";

type Props = {
  record: PropertyTruthRecord | null;
};

function prettyStatus(status: string) {
  return status.replaceAll("_", " ");
}

export default function BeforeAfterPanel({ record }: Props) {
  if (!record) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-medium text-slate-900">Before</span>
            <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
              Unresolved
            </span>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">Gym</span>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600">
                  STALE
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Gym has not been confirmed recently.</p>
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-900">Pool</span>
                <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600">
                  STALE
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">Pool has not been confirmed recently.</p>
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="font-medium text-slate-900">After</span>
            <span className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
              Updated
            </span>
          </div>

          <div className="space-y-3">
            <div className="rounded-xl border border-slate-200 p-3 text-sm text-slate-500">
              Analyze a review to see updated property facts here.
            </div>

            <div className="rounded-xl border border-slate-200 p-3">
              <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Confidence score</div>
              <div className="mt-1 text-sm font-semibold text-slate-900">0%</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const attributes = Object.values(record.attributes);
  const unresolved = attributes.filter(
    (item) => item.freshness === "unresolved" || item.freshness === "stale" || item.freshness === "conflicting"
  );
  const resolved = attributes.filter((item) => item.freshness === "resolved");

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="rounded-2xl border border-slate-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-medium text-slate-900">Before</span>
          <span className="rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            Unresolved
          </span>
        </div>

        <div className="space-y-3">
          {unresolved.length === 0 ? (
            <p className="text-sm text-slate-500">No unresolved attributes.</p>
          ) : (
            unresolved.map((item) => (
              <div key={item.attribute} className="rounded-xl border border-slate-200 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-900">{item.label}</span>
                  <span className="rounded-full border border-rose-200 bg-rose-50 px-2 py-1 text-[11px] font-semibold text-rose-600">
                    {item.freshness.toUpperCase()}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  {item.last_evidence || `${item.label} has not been confirmed yet.`}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 p-4">
        <div className="mb-3 flex items-center justify-between">
          <span className="font-medium text-slate-900">After</span>
          <span className="rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-semibold text-sky-700">
            Updated
          </span>
        </div>

        <div className="space-y-3">
          {resolved.length === 0 ? (
            <p className="text-sm text-slate-500">No updated attributes yet.</p>
          ) : (
            resolved.map((item) => (
              <div key={item.attribute} className="rounded-xl border border-sky-200 bg-sky-50 p-3">
                <div className="text-xs uppercase tracking-[0.2em] text-slate-500">{item.label}</div>
                <div className="mt-1 text-sm font-semibold text-slate-900">
                  Status: {prettyStatus(item.current_status)}
                </div>
                <div className="mt-1 text-xs text-slate-600">
                  Confidence: {Math.round(item.confidence * 100)}%
                </div>
                {item.last_evidence ? (
                  <p className="mt-2 text-xs text-slate-600">{item.last_evidence}</p>
                ) : null}
              </div>
            ))
          )}

          <div className="rounded-xl border border-slate-200 p-3">
            <div className="text-xs uppercase tracking-[0.2em] text-slate-500">Confidence score</div>
            <div className="mt-1 text-sm font-semibold text-slate-900">{record.confidence_score}%</div>
          </div>
        </div>
      </div>
    </div>
  );
}