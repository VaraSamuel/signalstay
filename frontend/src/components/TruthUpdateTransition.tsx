"use client";

import { CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
import type { PropertyTruthRecord } from "@/lib/types";

type Props = {
  previousRecord: PropertyTruthRecord | null;
  currentRecord: PropertyTruthRecord | null;
  visible: boolean;
};

type ChangeItem = {
  attribute: string;
  label: string;
  fromFreshness: string;
  toFreshness: string;
};

function prettify(value?: string | null) {
  if (!value) return "unknown";
  return value.replace(/_/g, " ");
}

function getResolvedCount(record: PropertyTruthRecord | null) {
  if (!record) return 0;
  return Object.values(record.attributes).filter(
    (item) => item.freshness === "resolved"
  ).length;
}

function getAttributeChanges(
  previousRecord: PropertyTruthRecord | null,
  currentRecord: PropertyTruthRecord | null
): ChangeItem[] {
  if (!currentRecord) return [];

  const previousAttributes = previousRecord?.attributes ?? {};
  const currentAttributes = currentRecord.attributes ?? {};

  return Object.entries(currentAttributes)
    .map(([attribute, current]) => {
      const previous = previousAttributes[attribute];
      return {
        attribute,
        label: current.label || attribute,
        fromFreshness: previous?.freshness ?? "unresolved",
        toFreshness: current.freshness,
      };
    })
    .filter((item) => item.fromFreshness !== item.toFreshness)
    .slice(0, 4);
}

function toneClass(freshness: string) {
  if (freshness === "resolved") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (freshness === "conflicting") return "border-fuchsia-200 bg-fuchsia-50 text-fuchsia-700";
  if (freshness === "stale") return "border-rose-200 bg-rose-50 text-rose-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default function TruthUpdateTransition({
  previousRecord,
  currentRecord,
  visible,
}: Props) {
  if (!visible || !currentRecord) return null;

  const changes = getAttributeChanges(previousRecord, currentRecord);
  const previousConfidence = previousRecord?.confidence_score ?? 0;
  const currentConfidence = currentRecord?.confidence_score ?? 0;
  const previousResolved = getResolvedCount(previousRecord);
  const currentResolved = getResolvedCount(currentRecord);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/45 px-4 backdrop-blur-sm">
      <div className="w-full max-w-2xl animate-[fadeIn_.25s_ease-out] rounded-[32px] border border-sky-200 bg-white p-7 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xl font-semibold text-slate-900">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              Truth state updated
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Your follow-up refreshed this property’s knowledge. Redirecting to the updated dashboard…
            </p>
          </div>

          <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
            Live diff
          </div>
        </div>

        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
              Confidence
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {previousConfidence} <span className="text-slate-400">→</span> {currentConfidence}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
              Resolved topics
            </div>
            <div className="mt-2 text-2xl font-bold text-slate-900">
              {previousResolved} <span className="text-slate-400">→</span> {currentResolved}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
            <Sparkles className="h-4 w-4 text-sky-600" />
            Attribute transitions
          </div>

          {changes.length > 0 ? (
            <div className="space-y-3">
              {changes.map((change, index) => (
                <div
                  key={change.attribute}
                  className="animate-[slideUp_.35s_ease-out] rounded-2xl border border-slate-200 bg-white p-4"
                  style={{ animationDelay: `${index * 120}ms`, animationFillMode: "both" }}
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="text-sm font-semibold text-slate-900">{change.label}</div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneClass(
                          change.fromFreshness
                        )}`}
                      >
                        {prettify(change.fromFreshness)}
                      </span>

                      <ArrowRight className="h-4 w-4 text-slate-400" />

                      <span
                        className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${toneClass(
                          change.toFreshness
                        )}`}
                      >
                        {prettify(change.toFreshness)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-4 text-sm text-slate-500">
              No large freshness transition was detected, but the property truth record was still updated.
            </div>
          )}
        </div>

        <div className="mt-6">
          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
            <div className="h-full animate-[progressBar_2.2s_linear_forwards] rounded-full bg-sky-600" />
          </div>
        </div>

        <style jsx>{`
          @keyframes fadeIn {
            from {
              opacity: 0;
              transform: scale(0.98);
            }
            to {
              opacity: 1;
              transform: scale(1);
            }
          }

          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @keyframes progressBar {
            from {
              width: 0%;
            }
            to {
              width: 100%;
            }
          }
        `}</style>
      </div>
    </div>
  );
}