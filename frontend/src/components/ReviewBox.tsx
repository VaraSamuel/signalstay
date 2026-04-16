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

  const handleToggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <section className="p-6">
      <VoiceInputButton
        isSupported={true}
        isListening={isListening}
        onToggle={handleToggleListening}
        label="Toggle voice input"
      />

      {error && <div className="text-red-500">{error}</div>}

      <textarea
        value={reviewText}
        onChange={(e) => setReviewText(e.target.value)}
        className="w-full border p-3 rounded-lg"
      />

      <button
        onClick={onAnalyze}
        disabled={loading}
        className="mt-4 bg-black text-white px-4 py-2 rounded-lg"
      >
        {loading ? "Analyzing..." : "Analyze"}
      </button>
    </section>
  );
}
