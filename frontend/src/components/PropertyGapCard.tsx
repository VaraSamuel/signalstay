import { AlertTriangle, CheckCircle2, Clock3, RefreshCcw } from "lucide-react";

type TopicStatusItem = {
  status: string;
  mentions?: number;
  last_mentioned?: string | null;
  months_stale?: number;
  stale_score?: number;
  conflict_count?: number;
  confidence?: number | null;
  source?: string | null;
  label?: string | null;
};

type Props = {
  topic: string;
  info: TopicStatusItem;
};

const STATUS_STYLES: Record<
  string,
  {
    chip: string;
    bar: string;
    icon: React.ReactNode;
    accent: string;
    label: string;
  }
> = {
  fresh: {
    chip: "border-emerald-200 bg-emerald-50 text-emerald-700",
    bar: "bg-emerald-500",
    icon: <CheckCircle2 className="h-4 w-4 text-emerald-600" />,
    accent: "from-emerald-50 to-white",
    label: "Fresh",
  },
  stale: {
    chip: "border-rose-200 bg-rose-50 text-rose-700",
    bar: "bg-rose-500",
    icon: <Clock3 className="h-4 w-4 text-rose-600" />,
    accent: "from-rose-50 to-white",
    label: "Stale",
  },
  aging: {
    chip: "border-amber-200 bg-amber-50 text-amber-700",
    bar: "bg-amber-500",
    icon: <RefreshCcw className="h-4 w-4 text-amber-600" />,
    accent: "from-amber-50 to-white",
    label: "Aging",
  },
  conflicting: {
    chip: "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700",
    bar: "bg-fuchsia-500",
    icon: <AlertTriangle className="h-4 w-4 text-fuchsia-600" />,
    accent: "from-fuchsia-50 to-white",
    label: "Conflicting",
  },
  missing: {
    chip: "border-slate-200 bg-slate-100 text-slate-600",
    bar: "bg-slate-400",
    icon: <Clock3 className="h-4 w-4 text-slate-500" />,
    accent: "from-slate-50 to-white",
    label: "Missing",
  },
};

function clampPercent(value: number) {
  return Math.max(0, Math.min(100, value));
}

export default function PropertyGapCard({ topic, info }: Props) {
  const tone = STATUS_STYLES[info.status] || STATUS_STYLES.missing;
  const confidencePct = clampPercent(Math.round((info.confidence ?? 0) * 100));
  const mentions = info.mentions ?? 0;
  const monthsStale =
    typeof info.months_stale === "number" ? info.months_stale : 999;
  const staleScore =
    typeof info.stale_score === "number" ? info.stale_score : 1;
  const conflicts = info.conflict_count ?? 0;

  return (
    <div className={`rounded-[30px] border border-slate-200 bg-gradient-to-br ${tone.accent} p-5 shadow-sm transition duration-200 hover:-translate-y-1`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {tone.icon}
            <div className="truncate text-lg font-semibold capitalize text-slate-900">
              {(info.label || topic).replace(/_/g, " ")}
            </div>
          </div>

          <div className="mt-1 text-sm text-slate-500">
            {mentions} {mentions === 1 ? "mention" : "mentions"} • last seen{" "}
            {info.last_mentioned ?? "N/A"}
          </div>
        </div>

        <div
          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${tone.chip}`}
        >
          {tone.label}
        </div>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between text-xs font-medium text-slate-500">
          <span>Confidence</span>
          <span>{confidencePct}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-200">
          <div
            className={`h-full rounded-full ${tone.bar}`}
            style={{ width: `${confidencePct}%` }}
          />
        </div>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <MiniMetric
          label="Months stale"
          value={monthsStale >= 999 ? "N/A" : String(monthsStale)}
        />
        <MiniMetric label="Stale score" value={staleScore.toFixed(2)} />
        <MiniMetric label="Conflicts" value={String(conflicts)} />
      </div>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white/80 p-3">
        <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-400">
          Why this matters
        </div>
        <div className="mt-1 text-sm leading-6 text-slate-600">
          {info.status === "fresh"
            ? "This topic has recent evidence and is safer to trust in booking decisions."
            : info.status === "conflicting"
            ? "Travelers are sending mixed signals here, so this is a trust-sensitive issue."
            : info.status === "stale"
            ? "This topic has older evidence and should be re-verified before users rely on it."
            : "This topic lacks reliable recent evidence and is a strong candidate for follow-up."}
        </div>
      </div>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/90 p-3 text-center">
      <div className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-sm font-semibold text-slate-900">{value}</div>
    </div>
  );
}