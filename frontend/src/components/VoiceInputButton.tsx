"use client";

type Props = {
  isSupported: boolean;
  isListening: boolean;
  isReady: boolean;
  onStart: () => void;
  onStop: () => void;
};

export default function VoiceInputButton({
  isSupported,
  isListening,
  isReady,
  onStart,
  onStop,
}: Props) {
  if (!isReady) {
    return (
      <button
        type="button"
        disabled
        className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400"
      >
        Checking voice...
      </button>
    );
  }

  if (!isSupported) {
    return (
      <button
        type="button"
        disabled
        className="rounded-full border border-slate-200 bg-slate-100 px-4 py-2 text-sm font-medium text-slate-400"
      >
        Voice unavailable
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={isListening ? onStop : onStart}
      className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
        isListening
          ? "border-rose-300 bg-rose-50 text-rose-700"
          : "border-sky-300 bg-sky-50 text-sky-700"
      }`}
    >
      {isListening ? "Stop voice input" : "Use voice"}
    </button>
  );
}