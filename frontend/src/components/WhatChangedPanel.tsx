"use client";

type PropertyTruthRecord = any;

type Props = {
  previousRecord: PropertyTruthRecord | null;
  currentRecord: PropertyTruthRecord | null;
};

export default function WhatChangedPanel({
  previousRecord,
  currentRecord
}: Props) {
  if (!previousRecord && !currentRecord) {
    return null;
  }

  return (
    <div className="p-4 border rounded-lg">
      <div className="text-sm text-slate-600">
        What changed
      </div>

      <pre className="text-xs mt-2">
        {JSON.stringify({ previousRecord, currentRecord }, null, 2)}
      </pre>
    </div>
  );
}
