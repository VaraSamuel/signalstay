"use client";

type Props = {
  title: string;
  value: number;
  delta?: number;
  suffix?: string;
};

export default function ConfidenceScoreCard({
  title,
  value,
  delta,
  suffix = "",
}: Props) {
  const positive = (delta || 0) >= 0;

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-sm text-slate-500">{title}</div>
      <div className="mt-2 text-3xl font-bold text-slate-900">
        {value.toFixed(1)}
        {suffix}
      </div>
      {typeof delta === "number" ? (
        <div
          className={`mt-2 text-sm font-medium ${
            positive ? "text-emerald-600" : "text-rose-600"
          }`}
        >
          {positive ? "↑" : "↓"} {Math.abs(delta).toFixed(1)} vs baseline
        </div>
      ) : null}
    </div>
  );
}