type Props = {
  selectedTopics: {
    topic: string;
    why: string;
  }[];
};

export default function WhyThisQuestion({ selectedTopics }: Props) {
  if (!selectedTopics.length) return null;

  return (
    <section className="glass-card rounded-[28px] p-6">
      <div className="mb-1 text-lg font-semibold text-slate-900">Why these questions?</div>
      <div className="mb-5 text-sm leading-6 text-slate-600">
        SignalStay explains exactly why each follow-up was selected, based on freshness and trust risk.
      </div>

      <div className="space-y-4">
        {selectedTopics.map((item) => (
          <div
            key={item.topic}
            className="rounded-3xl border border-black/10 bg-white/70 p-5"
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-base font-semibold capitalize text-slate-900">
                {item.topic.replace(/_/g, " ")}
              </div>
              <span className="rounded-full border border-black/10 bg-slate-50 px-3 py-1 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                Reason
              </span>
            </div>
            <div className="mt-3 text-sm leading-7 text-slate-600">{item.why}</div>
          </div>
        ))}
      </div>
    </section>
  );
}