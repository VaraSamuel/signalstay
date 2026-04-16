"use client";

import { useMemo, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Activity, Clock3, Sparkles } from "lucide-react";

type LegacyTimeline = Record<string, Record<string, number>>;

type TimelineEvent = {
  date?: string;
  topic?: string;
  status?: string;
  source?: string | null;
};

type Props = {
  timeline: LegacyTimeline | TimelineEvent[] | null | undefined;
};

type ChartPoint = {
  date: string;
  count: number;
};

function isLegacyTimeline(value: unknown): value is LegacyTimeline {
  return !!value && !Array.isArray(value) && typeof value === "object";
}

function isTimelineArray(value: unknown): value is TimelineEvent[] {
  return Array.isArray(value);
}

export default function TopicTimelineChart({ timeline }: Props) {
  const availableTopics = useMemo(() => {
    if (isLegacyTimeline(timeline)) {
      return Object.keys(timeline);
    }

    if (isTimelineArray(timeline)) {
      return Array.from(
        new Set(
          timeline
            .map((item) => item?.topic)
            .filter((value): value is string => Boolean(value))
        )
      );
    }

    return [];
  }, [timeline]);

  const [selectedTopic, setSelectedTopic] = useState<string>("");

  const effectiveTopic =
    selectedTopic || availableTopics[0] || "all_topics";

  const chartData = useMemo<ChartPoint[]>(() => {
    if (isLegacyTimeline(timeline)) {
      const points = timeline[effectiveTopic] || {};
      return Object.entries(points)
        .map(([date, count]) => ({
          date,
          count: Number(count) || 0,
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    if (isTimelineArray(timeline)) {
      const filtered = timeline.filter((item) =>
        effectiveTopic === "all_topics" ? true : item.topic === effectiveTopic
      );

      const grouped = new Map<string, number>();

      for (const item of filtered) {
        const date = item.date || "Unknown";
        grouped.set(date, (grouped.get(date) || 0) + 1);
      }

      return Array.from(grouped.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));
    }

    return [];
  }, [timeline, effectiveTopic]);

  const activityFeed = useMemo(() => {
    if (!isTimelineArray(timeline)) return [];

    return timeline
      .filter((item) =>
        effectiveTopic === "all_topics" ? true : item.topic === effectiveTopic
      )
      .slice()
      .sort((a, b) => (b.date || "").localeCompare(a.date || ""))
      .slice(0, 6);
  }, [timeline, effectiveTopic]);

  const distinctDates = useMemo(
    () => new Set(chartData.map((item) => item.date)).size,
    [chartData]
  );

  const canRenderChart = chartData.length >= 3 && distinctDates >= 2;

  const trendInsight = useMemo(() => {
    if (!chartData.length) {
      return "No timeline activity yet. As more reviews and follow-ups come in, this panel will reveal whether a topic is becoming more important, more uncertain, or more stable.";
    }

    if (chartData.length < 2) {
      return "We have activity for this topic, but not enough historical depth yet to infer a reliable trend.";
    }

    const first = chartData[0]?.count ?? 0;
    const last = chartData[chartData.length - 1]?.count ?? 0;
    const label = effectiveTopic.replace(/_/g, " ");

    if (last > first) {
      return `${label} activity is increasing. That usually means this topic is becoming more important to travelers or is emerging as a recurring issue.`;
    }

    if (last < first) {
      return `${label} activity is declining. That can mean the issue is becoming less visible, but it may also mean the property needs a fresh verification signal.`;
    }

    return `${label} activity is relatively stable so far. More review updates will make this trend signal sharper.`;
  }, [chartData, effectiveTopic]);

  return (
    <div className="rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">
      <div className="mb-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="flex items-center gap-2 text-lg font-semibold text-slate-900">
            <Activity className="h-5 w-5 text-sky-600" />
            Review intelligence timeline
          </div>
          <div className="mt-1 text-sm text-slate-500">
            See whether a topic is gaining attention, staying stable, or still too sparse to trend.
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {chartData.length} updates recorded
          </div>
          <select
            value={effectiveTopic}
            onChange={(e) => setSelectedTopic(e.target.value)}
            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-sky-300 focus:bg-white"
          >
            {availableTopics.length === 0 ? (
              <option value="all_topics">No topics yet</option>
            ) : (
              availableTopics.map((topic) => (
                <option key={topic} value={topic}>
                  {topic.replace(/_/g, " ")}
                </option>
              ))
            )}
          </select>
        </div>
      </div>

      {canRenderChart ? (
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
          <div className="h-[340px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid stroke="rgba(15,23,42,0.08)" strokeDasharray="4 4" />
                <XAxis dataKey="date" stroke="#64748b" tick={{ fontSize: 12 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    background: "#ffffff",
                    border: "1px solid rgba(15,23,42,0.08)",
                    borderRadius: 16,
                    color: "#111827",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="count"
                  stroke="#0ea5e9"
                  strokeWidth={3}
                  dot={{ r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : (
        <div className="rounded-[28px] border border-slate-200 bg-slate-50 p-5">
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-slate-700">
            <Clock3 className="h-4 w-4 text-sky-600" />
            Activity feed
          </div>

          {activityFeed.length > 0 ? (
            <div className="space-y-3">
              {activityFeed.map((item, index) => (
                <div
                  key={`${item.date}-${item.topic}-${index}`}
                  className="rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm font-semibold capitalize text-slate-900">
                      {(item.topic || "Unknown topic").replace(/_/g, " ")}
                    </div>
                    <div className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-600">
                      {item.status || "unknown"}
                    </div>
                  </div>
                  <div className="mt-2 text-sm text-slate-500">
                    {item.date || "Unknown date"} • {item.source || "system"}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">
              Not enough timeline evidence yet. Keep collecting reviews and follow-ups to unlock a real trend view.
            </div>
          )}
        </div>
      )}

      <div className="mt-5 rounded-2xl border border-sky-200 bg-sky-50 p-4">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 h-4 w-4 text-sky-700" />
          <div className="text-sm leading-6 text-slate-700">{trendInsight}</div>
        </div>
      </div>
    </div>
  );
}