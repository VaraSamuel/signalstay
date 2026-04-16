"use client";

import Link from "next/link";

export default function ExpediaHeader() {
  return (
    <header className="w-full">
      {/* Top bar */}
      <div className="bg-white border-b border-slate-200">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#FDBB2D]">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-[#0A438B]">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" stroke="#0A438B" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <span className="text-[22px] font-extrabold tracking-tight text-[#0A438B]">Expedia</span>
              <span className="ml-2 text-[11px] font-semibold uppercase tracking-widest text-[#FDBB2D] bg-[#0A438B] px-2 py-0.5 rounded-full">
                HACK-AI-THON
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-1">
            <div className="px-4 py-2 text-sm font-bold rounded-full bg-[#0A438B] text-white">
              Property Reviews
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-800">Samuel, Hudah, Muskan</div>
              <div className="text-xs text-slate-500">Wharton AI & Analytics Hack-AI-Thon</div>
            </div>
            <div className="h-9 w-9 rounded-full bg-[#0A438B] flex items-center justify-center text-white text-sm font-bold">
              SHM
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
