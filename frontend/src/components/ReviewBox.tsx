"use client";

import { useCallback } from "react";
import VoiceInputButton from "@/components/VoiceInputButton";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";

type Props = {
  reviewText: string;
  setReviewText: (value: string) => void;
  onAnalyze: () => void;
  loading: boolean;
};

export default function ReviewBox({
  reviewText,
  setReviewText,
  onAnalyze,
  loading
}: Props) {
  const handleTranscript = useCallback(
    (text: string) => {
      setReviewText(text);
    },
    [setReviewText]
  );

  const {
    isSupported,
    isListening,
    error,
    toggleListening
  } = useSpeechRecognition(handleTranscript, {
    lang: "en-US",
    continuous: true,
    interimResults: true
  });

  return (
    <section className="glass-card-strong rounded-[30px] p-6">
      <div className="mb-1 text-lg font-semibold text-slate-900">Traveler review</div>
      <div className="mb-4 text-sm leading-6 text-slate-600">
        Write or dictate the initial review. SignalStay will detect what is already covered and ask
        only the highest-value follow-up questions.
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <VoiceInputButton
          isSupported={isSupported}
          isListening={isListening}
          onToggle={toggleListening}
          label="Toggle review voice input"
        />
        <div className="text-xs text-slate-500">
          {isListening ? "Listening…" : "You can type or use voice input"}
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-2xl border border-rose-300 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {error}
        </div>
      ) : null}

      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        placeholder="Write your review here..."
        className="min-h-[180px] w-full rounded-[24px] border border-black/10 bg-white px-4 py-4 text-sm text-slate-900 outline-none placeholder:text-slate-400"
      />

      <button
        onClick={onAnalyze}
        disabled={loading}
        className="mt-4 rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white transition duration-300 hover:translate-y-[-1px] hover:opacity-95 disabled:opacity-60"
      >
        {loading ? "Analyzing..." : "Analyze Review"}
      </button>
    </section>
  );
}