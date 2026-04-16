"use client";

import { useState } from "react";
import Link from "next/link";
import type { PropertySummary } from "@/lib/types";

type Props = {
  property: PropertySummary;
};

function StarRating({ starRating }: { starRating: number }) {
  // starRating is on 0–5 scale (actual hotel star classification)
  const full = Math.floor(starRating);
  const half = starRating - full >= 0.4;
  const empty = 5 - full - (half ? 1 : 0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <svg key={`f${i}`} className="h-4 w-4 fill-[#FDBB2D]" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.352 2.438c-.785.57-1.84-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.663 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/>
        </svg>
      ))}
      {half && (
        <svg className="h-4 w-4" viewBox="0 0 20 20">
          <defs>
            <linearGradient id="half-star">
              <stop offset="50%" stopColor="#FDBB2D"/>
              <stop offset="50%" stopColor="#e2e8f0"/>
            </linearGradient>
          </defs>
          <path fill="url(#half-star)" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.352 2.438c-.785.57-1.84-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.663 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/>
        </svg>
      )}
      {Array.from({ length: empty }).map((_, i) => (
        <svg key={`e${i}`} className="h-4 w-4 fill-slate-200" viewBox="0 0 20 20">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.368 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118L10 15.347l-3.352 2.438c-.785.57-1.84-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.663 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z"/>
        </svg>
      ))}
      <span className="ml-1 text-xs font-semibold text-slate-600">{starRating.toFixed(1)}</span>
    </div>
  );
}

function freshnessColor(freshness: number) {
  if (freshness >= 60) return "text-emerald-600 bg-emerald-50 border-emerald-200";
  if (freshness >= 40) return "text-amber-600 bg-amber-50 border-amber-200";
  return "text-rose-600 bg-rose-50 border-rose-200";
}

export default function PropertyCard({ property }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [currentValues, setCurrentValues] = useState<any>(null);
  const [loadingValues, setLoadingValues] = useState(false);

  async function handleViewCurrentValues(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setShowModal(true);
    if (currentValues) return;

    setLoadingValues(true);
    try {
      const res = await fetch(`/api/property/${property.id}/current-values`);
      if (!res.ok) throw new Error("Failed to load current values");
      const data = await res.json();
      setCurrentValues(data);
    } catch (err) {
      console.error("Error loading current values:", err);
      setCurrentValues({ error: "Failed to load values" });
    } finally {
      setLoadingValues(false);
    }
  }
  return (
    <Link
      href={`/review?propertyId=${encodeURIComponent(property.id)}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
    >
      {/* Thumbnail */}
      <div className="relative h-52 w-full overflow-hidden bg-slate-100 shrink-0">
        <img
          src={property.thumbnail_url || "/placeholder.jpg"}
          alt={property.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        {/* Trust score badge */}
        <div className="absolute top-3 left-3 rounded-xl bg-white/95 shadow px-3 py-1.5 flex items-center gap-2">
          <StarRating starRating={property.star_rating ?? 0} />
        </div>
        {/* Freshness badge */}
        <div className={`absolute top-3 right-3 rounded-xl border px-2.5 py-1 text-[11px] font-bold ${freshnessColor(property.current_freshness)}`}>
          {property.current_freshness < 50 ? "Stale signals" : "Fresh signals"}
        </div>
      </div>

      {/* Content */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        {/* Badges */}
        <div className="flex flex-wrap gap-1.5">
          {property.badges.slice(0, 2).map((badge) => (
            <span
              key={badge}
              className="rounded-full bg-[#E8F1FF] px-2.5 py-0.5 text-[11px] font-semibold text-[#0A438B]"
            >
              {badge}
            </span>
          ))}
        </div>

        {/* Name & location */}
        <div>
          <h3 className="line-clamp-2 text-[17px] font-bold leading-snug text-slate-900">
            {property.name}
          </h3>
          <p className="mt-1 text-sm text-slate-500 flex items-center gap-1">
            <svg className="h-3.5 w-3.5 fill-slate-400" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd"/>
            </svg>
            {property.city}, {property.country}
          </p>
        </div>

        {/* Score bar */}
        <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-50 p-3 text-center">
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Trust</div>
            <div className="text-base font-extrabold text-[#0A438B]">{property.trust_score.toFixed(1)}</div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Confidence</div>
            <div className="text-base font-bold text-slate-700">{property.current_confidence.toFixed(0)}</div>
          </div>
          <div>
            <div className="text-[10px] font-medium uppercase tracking-wide text-slate-400">Hotel ★</div>
            <div className="text-base font-bold text-slate-700">{property.star_rating?.toFixed(1) ?? "N/A"}</div>
          </div>
        </div>

        {/* Hint */}
        <p className="line-clamp-2 text-xs text-slate-500 flex-1">
          {property.stale_hint || property.area_description || property.property_description}
        </p>

        {/* CTAs */}
        <div className="pt-1 flex items-center gap-2">
          <div className="flex items-center gap-2 text-sm font-bold text-[#0A438B] group-hover:gap-3 transition-all flex-1">
            <span>Answer the best question</span>
            <span>→</span>
          </div>
          <a
            href={`/dashboard?propertyId=${encodeURIComponent(property.id)}`}
            onClick={(e) => e.stopPropagation()}
            className="shrink-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-[#0A438B] hover:text-white hover:border-[#0A438B] transition-colors"
          >
            View Dashboard
          </a>
        </div>
      </div>
    </Link>
  );
}
