"use client";

import type { PropertyTruthRecord } from "@/lib/types";
import { ArrowRight, Sparkles, TrendingUp } from "lucide-react";

type Props = {
  previousRecord: PropertyTruthRecord | null;
  currentRecord: PropertyTruthRecord | null;
};

type AttributeChange = {
  attribute: string;
  label: string;
  fromFreshness: string;
  toFreshness: string;
  fromStatus: string;
  toStatus: string;
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

function getUnresolvedCount(record: PropertyTruthRecord | null) {
  if (!record) return 0;
  return Object.values(record.attributes).filter(
    (item) =>
      item.freshness === "unresolved" ||
      item.freshness === "stale" ||
      item.freshness === "conflicting"
  ).length;
}

function getAttributeChanges(
  previousRecord: PropertyTruthRecord | null,
  currentRecord: PropertyTruthRecord | null
): AttributeChange[] {
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
        fromStatus: previous?.current_status ?? "unknown",
        toStatus: current.current_status,
      };
    })
    .filter(
      (item) =>
        item.fromFreshness !== item.toFreshness ||
        item.fromStatus !== item.toStatus
    );
}

function freshnessTone(freshness: string) {
  if (freshness === "resolved") return "bg-emerald-50 text-emerald-700 border-emerald-200";
  if (freshness === "conflicting") return "bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200";
  if (freshness === "stale") return "bg-rose-50 text-rose-700 border-rose-200";
  return "bg-amber-50 text-amber-700 border-amber-200";
}

export default function WhatChangedPanel({
  previousRecord,
  currentRecord,
}: Props) {
  const changes = getAttributeChanges(previousRecord, currentRecord);

  const previousConfidence = previousRecord?.confidence_score ?? 0;
  const currentConfidence = currentRecord?.confidence_score ?? 0;
  const confidenceDelta = currentConfidence - previousConfidence;

  const previousResolved = getResolvedCount(previousRecord);
  const currentResolved = getResolvedCount(currentRecord);
  const resolvedDelta = currentResolved - previousResolved;

  const previousUnresolved = getUnresolvedCount(previousRecord);
  const currentUnresolved = getUnresolvedCount(currentRecord);
  const unresolvedDelta = previousUnresolved - currentUnresolved;

  const hasAnyChange =
    changes.length > 0 ||
    confidenceDelta !== 0 ||
    resolvedDelta !== 0 ||
    unresolvedDelta !== 0;

  return (
    <section className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Sparkles className="h-5 w-5 text-sky-600" />
            What changed
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Live truth-state movement after the latest review or follow-up.
          </p>
        </div>

        <div className="rounded-full bg-sky-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-sky-700">
          Delta view
        </div>
      </div>

      {!hasAnyChange ? (
        <div className="mt-5 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
          No state change yet. Submit a review or follow-up to see freshness, confidence, and attribute transitions here.
        </div>
      ) : (
        <>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Confidence
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {previousConfidence} <span className="text-slate-400">→</span> {currentConfidence}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {confidenceDelta >= 0 ? "+" : ""}
                {confidenceDelta} points
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Resolved topics
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {previousResolved} <span className="text-slate-400">→</span> {currentResolved}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {resolvedDelta >= 0 ? "+" : ""}
                {resolvedDelta} topics
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">
                Uncertainty reduced
              </div>
              <div className="mt-2 text-2xl font-bold text-slate-900">
                {previousUnresolved} <span className="text-slate-400">→</span> {currentUnresolved}
              </div>
              <div className="mt-1 text-xs text-slate-500">
                {unresolvedDelta >= 0 ? "-" : "+"}
                {Math.abs(unresolvedDelta)} uncertain topics
              </div>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900">
              <TrendingUp className="h-4 w-4 text-sky-600" />
              Attribute transitions
            </div>

            {changes.length > 0 ? (
              <div className="space-y-3">
                {changes.map((change) => (
                  <div
                    key={change.attribute}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-sm font-semibold text-slate-900">
                          {change.label}
                        </div>
                        <div className="mt-1 text-xs text-slate-500">
                          Status: {prettify(change.fromStatus)} <span className="text-slate-400">→</span>{" "}
                          {prettify(change.toStatus)}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${freshnessTone(
                            change.fromFreshness
                          )}`}
                        >
                          {prettify(change.fromFreshness)}
                        </span>
                        <ArrowRight className="h-4 w-4 text-slate-400" />
                        <span
                          className={`rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] ${freshnessTone(
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
              <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
                No attribute-level transitions were detected yet.
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}