"use client";

import { useEffect } from "react";
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
  const {
    transcript,
    isListening,
    error,
    startListening,
    stopListening
  } = useSpeechRecognition();

  useEffect(() => {
    if (transcript) {
      setReviewText(transcript);
    }
  }, [transcript, setReviewText]);

  return (
    <section className="p-6">
      <VoiceInputButton
        isSupported={true}
        isListening={isListening}
        isReady={true}
        onStart={startListening}
        onStop={stopListening}
      />

      {error ? (
        <div className="mt-2 text-sm text-red-500">{error}</div>
      ) : null}

      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        className="mt-4 w-full rounded-lg border p-3"
        placeholder="Write your review..."
      />

      <button
        onClick={onAnalyze}
        disabled={loading}
        className="mt-4 rounded-lg bg-black px-4 py-2 text-white"
      >
        {loading ? "Analyzing..." : "Analyze"}
      </button>
    </section>
  );
}
