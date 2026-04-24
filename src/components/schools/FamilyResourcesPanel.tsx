"use client";

import { useState } from "react";
import { formatCurrency } from "@/lib/format";

type Props = {
  spousePartnerNetwork: boolean;
  violentCrimeGrade: string | null;
  propertyCrimeGrade: string | null;
  avgDaycareCost: number | null;
  streetViewEmbedUrl: string;
  streetViewExternalUrl?: string;
};

export function FamilyResourcesPanel({
  spousePartnerNetwork,
  violentCrimeGrade,
  propertyCrimeGrade,
  avgDaycareCost,
  streetViewEmbedUrl,
  streetViewExternalUrl,
}: Props) {
  const [tab, setTab] = useState<"environment" | "streetview">("environment");

  return (
    <section className="surface rounded-[1.6rem] p-5">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setTab("environment")}
          className={`rounded-full border px-3 py-1.5 text-xs ${
            tab === "environment"
              ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
              : "border-white/10 text-slate-300"
          }`}
        >
          Family & Environment
        </button>
        <button
          type="button"
          onClick={() => setTab("streetview")}
          className={`rounded-full border px-3 py-1.5 text-xs ${
            tab === "streetview"
              ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
              : "border-white/10 text-slate-300"
          }`}
        >
          Street View
        </button>
      </div>

      {tab === "environment" ? (
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Spouse / Partner Network</p>
            <p className="mt-2 text-2xl font-semibold text-white">{spousePartnerNetwork ? "Available" : "Not listed"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Average Daycare Cost</p>
            <p className="mt-2 text-2xl font-semibold text-white">
              {avgDaycareCost != null ? formatCurrency(avgDaycareCost) : "Not loaded"}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Violent Crime Grade</p>
            <p className="mt-2 text-2xl font-semibold text-white">{violentCrimeGrade ?? "Not loaded"}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Property Crime Grade</p>
            <p className="mt-2 text-2xl font-semibold text-white">{propertyCrimeGrade ?? "Not loaded"}</p>
          </div>
        </div>
      ) : (
        <div className="mt-4 space-y-3">
          <div className="overflow-hidden rounded-2xl border border-white/10">
            <iframe
              title="Main hospital street view"
              src={streetViewEmbedUrl}
              className="h-[320px] w-full"
              loading="lazy"
              allow="fullscreen"
            />
          </div>
          {streetViewExternalUrl ? (
            <a
              href={streetViewExternalUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-4 py-2 text-xs font-medium text-cyan-200 hover:bg-cyan-400/20"
            >
              Open full Street View on Google Maps
              <span aria-hidden>↗</span>
            </a>
          ) : null}
        </div>
      )}
    </section>
  );
}

