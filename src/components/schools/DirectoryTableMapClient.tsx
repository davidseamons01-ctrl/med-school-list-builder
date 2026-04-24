"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle } from "lucide-react";
import { SchoolMap } from "@/components/SchoolMap";
import { formatCurrency } from "@/lib/format";

type Row = {
  id: string;
  slug: string;
  name: string;
  state: string;
  zip: string | null;
  city: string;
  control: string;
  lat: number | null;
  lng: number | null;
  fitScore: number;
  tier: string;
  tuition: number | null;
  localRentMonthly: number | null;
  trueCol: number | null;
  trueMonthlyCol: number | null;
  medianMcatRaw: number | null;
  medianMcat: number | null;
  medianGpa: number | null;
  annualCost: number | null;
  isT20Research: boolean;
  isFamilyFriendly: boolean;
  hasThreeYearTrackRaw: boolean | null;
  hasThreeYearTrack: boolean;
};

type SortKey = "name" | "fitScore" | "annualCost" | "medianMcat" | "hasThreeYearTrack";

const CYCLE_OPTIONS = [
  { label: "Considering", value: "CONSIDERING" },
  { label: "Primary", value: "APPLY" },
  { label: "Secondary", value: "SECONDARY" },
] as const;

function num(v: number | null) {
  return v ?? Number.NEGATIVE_INFINITY;
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function fitTone(score: number) {
  if (score >= 85) return "text-emerald-300";
  if (score >= 70) return "text-amber-300";
  return "text-rose-300";
}

const TH_CLASS =
  "whitespace-nowrap px-4 py-3 text-left sticky top-0 z-10 bg-slate-900 border-b border-white/10 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-400";
const TD_CLASS = "whitespace-nowrap px-4 py-3 text-sm text-slate-200";

export function DirectoryTableMapClient({
  rows,
  initialChip,
}: {
  rows: Row[];
  initialChip: "all" | "high_oos" | "t20_research" | "family_friendly";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [chip, setChip] = useState<"all" | "high_oos" | "t20_research" | "family_friendly">(initialChip);
  const [sortKey, setSortKey] = useState<SortKey>("fitScore");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [visibleCount, setVisibleCount] = useState(60);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [radiusZip, setRadiusZip] = useState("");
  const [radiusMiles, setRadiusMiles] = useState(500);
  const [radiusEnabled, setRadiusEnabled] = useState(false);

  function setServerFilter(nextChip: "all" | "high_oos" | "t20_research" | "family_friendly") {
    setChip(nextChip);
    const next = new URLSearchParams(searchParams.toString());
    if (nextChip === "all") next.delete("chip");
    else next.set("chip", nextChip);
    router.replace(`${pathname}?${next.toString()}`);
  }

  const radiusFiltered = useMemo(() => {
    if (!radiusEnabled || !radiusZip.trim()) return rows;
    const candidates = rows.filter((row) => row.zip === radiusZip.trim() && row.lat != null && row.lng != null);
    if (candidates.length === 0) return rows;
    const center = candidates.reduce(
      (acc, row) => ({ lat: acc.lat + (row.lat ?? 0), lng: acc.lng + (row.lng ?? 0) }),
      { lat: 0, lng: 0 },
    );
    const centerLat = center.lat / candidates.length;
    const centerLng = center.lng / candidates.length;
    return rows.filter((row) => {
      if (row.lat == null || row.lng == null) return false;
      return haversineMiles(centerLat, centerLng, row.lat, row.lng) <= radiusMiles;
    });
  }, [rows, radiusEnabled, radiusZip, radiusMiles]);

  const sorted = useMemo(() => {
    const sortedRows = [...radiusFiltered].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "fitScore") return a.fitScore - b.fitScore;
      if (sortKey === "annualCost") return num(a.annualCost) - num(b.annualCost);
      if (sortKey === "medianMcat") return num(a.medianMcat) - num(b.medianMcat);
      return Number(Boolean(a.hasThreeYearTrack)) - Number(Boolean(b.hasThreeYearTrack));
    });
    if (sortDir === "desc") sortedRows.reverse();
    return sortedRows;
  }, [radiusFiltered, sortDir, sortKey]);

  const visibleRows = sorted.slice(0, visibleCount);

  function onSort(nextKey: SortKey) {
    if (sortKey === nextKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      return;
    }
    setSortKey(nextKey);
    setSortDir(nextKey === "name" ? "asc" : "desc");
  }

  async function quickCycle(slug: string, applyStatus: "CONSIDERING" | "APPLY" | "SECONDARY") {
    setLoadingSlug(slug);
    try {
      await fetch("/api/cycle/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, applyStatus }),
      });
    } finally {
      setLoadingSlug(null);
    }
  }

  const mapRows = sorted.map((r) => ({
    slug: r.slug,
    name: r.name,
    city: r.city,
    state: r.state,
    control: r.control,
    lat: r.lat,
    lng: r.lng,
    score: r.fitScore,
    annualCost: r.annualCost,
    tier: r.tier,
  }));

  return (
    <div className="space-y-6">
      <div className="surface rounded-[1.5rem] p-4 space-y-4">
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap pb-1">
          <button
            type="button"
            onClick={() => setServerFilter("all")}
            className={`rounded-full border px-3 py-1.5 text-xs ${chip === "all" ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200" : "border-white/10 text-slate-300"}`}
          >
            All Schools
          </button>
          <button
            type="button"
            onClick={() => setServerFilter("high_oos")}
            className={`rounded-full border px-3 py-1.5 text-xs ${chip === "high_oos" ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200" : "border-white/10 text-slate-300"}`}
          >
            High OOS Acceptance
          </button>
          <button
            type="button"
            onClick={() => setServerFilter("t20_research")}
            className={`rounded-full border px-3 py-1.5 text-xs ${chip === "t20_research" ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200" : "border-white/10 text-slate-300"}`}
          >
            T20 Research
          </button>
          <button
            type="button"
            onClick={() => setServerFilter("family_friendly")}
            className={`rounded-full border px-3 py-1.5 text-xs ${chip === "family_friendly" ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200" : "border-white/10 text-slate-300"}`}
          >
            Family-Friendly Locations
          </button>
          <div className="ml-auto text-xs text-slate-400">{sorted.length} rows</div>
        </div>

        <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
          <label className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
            Show My Radius (Zip)
            <input
              value={radiusZip}
              onChange={(e) => setRadiusZip(e.target.value.replace(/[^\d]/g, "").slice(0, 5))}
              placeholder="84604"
              className="mt-1 w-full bg-transparent text-sm text-white outline-none"
            />
          </label>
          <label className="rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
            Distance (miles)
            <input
              type="number"
              min={10}
              max={2000}
              value={radiusMiles}
              onChange={(e) => setRadiusMiles(Math.max(10, Number(e.target.value) || 10))}
              className="mt-1 w-28 bg-transparent text-sm text-white outline-none"
            />
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-slate-300">
            <input type="checkbox" checked={radiusEnabled} onChange={(e) => setRadiusEnabled(e.target.checked)} />
            Enable radius filter
          </label>
        </div>
      </div>

      <section className="w-full">
        <div className="w-full overflow-x-auto rounded-xl border border-white/10 bg-slate-950/40">
          <table className="w-full min-w-[960px] border-collapse text-sm">
            <thead>
              <tr>
                <th className={TH_CLASS}>
                  <button type="button" onClick={() => onSort("name")} className="text-left">
                    Name
                  </button>
                </th>
                <th className={`${TH_CLASS} text-right`}>
                  <button type="button" onClick={() => onSort("fitScore")} className="ml-auto block">
                    Holistic Fit
                  </button>
                </th>
                <th className={`${TH_CLASS} text-right`}>
                  <button type="button" onClick={() => onSort("annualCost")} className="ml-auto block">
                    True Annual Cost
                  </button>
                </th>
                <th className={`${TH_CLASS} text-right`}>
                  <button type="button" onClick={() => onSort("medianMcat")} className="ml-auto block">
                    Median MCAT
                  </button>
                </th>
                <th className={`${TH_CLASS} text-center`}>
                  <button type="button" onClick={() => onSort("hasThreeYearTrack")} className="mx-auto block">
                    3-Year MD
                  </button>
                </th>
                <th className={`${TH_CLASS} text-right`}>My Cycle</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => (
                <tr key={row.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className={`${TD_CLASS} text-slate-100`} title={row.name}>
                    {row.name}
                  </td>
                  <td className={`${TD_CLASS} text-right font-semibold ${fitTone(row.fitScore)}`}>
                    {Math.round(row.fitScore)}
                  </td>
                  <td className={`${TD_CLASS} text-right text-slate-300`}>{formatCurrency(row.annualCost)}</td>
                  <td className={`${TD_CLASS} text-right text-slate-300`}>
                    {row.medianMcatRaw == null ? <span className="text-slate-500">No data</span> : row.medianMcat}
                  </td>
                  <td className={`${TD_CLASS} text-center`}>
                    {row.hasThreeYearTrackRaw == null ? (
                      <span className="text-slate-500">No data</span>
                    ) : row.hasThreeYearTrack ? (
                      <CheckCircle className="mx-auto h-5 w-5 text-emerald-400" aria-label="3-Year MD pathway" />
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </td>
                  <td className={`${TD_CLASS} text-right`}>
                    <select
                      onChange={(e) =>
                        void quickCycle(row.slug, e.target.value as "CONSIDERING" | "APPLY" | "SECONDARY")
                      }
                      disabled={loadingSlug === row.slug}
                      defaultValue=""
                      className="rounded-lg border border-white/10 bg-slate-950/80 px-2 py-1 text-xs text-slate-200"
                    >
                      <option value="" disabled>
                        Select
                      </option>
                      {CYCLE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {visibleRows.length === 0 && (
                <tr>
                  <td className={`${TD_CLASS} py-8 text-center text-slate-400`} colSpan={6}>
                    No schools match the current filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {visibleCount < sorted.length && (
          <div className="mt-3 flex justify-center">
            <button
              type="button"
              onClick={() => setVisibleCount((c) => Math.min(c + 40, sorted.length))}
              className="rounded-xl border border-white/10 bg-slate-950/60 px-4 py-2 text-xs text-slate-200 hover:border-white/20"
            >
              Show more ({sorted.length - visibleCount} remaining)
            </button>
          </div>
        )}
      </section>

      <section className="mt-8 w-full">
        <div className="w-full overflow-hidden rounded-xl border border-white/10">
          <SchoolMap schools={mapRows} />
        </div>
      </section>
    </div>
  );
}
