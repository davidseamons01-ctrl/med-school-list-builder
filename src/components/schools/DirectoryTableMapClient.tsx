"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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

type SortKey = "name" | "fitScore" | "trueCol" | "medianMcat" | "hasThreeYearTrack";

const CYCLE_OPTIONS = [
  { label: "Considering", value: "CONSIDERING" },
  { label: "Primary", value: "APPLY" },
  { label: "Secondary", value: "SECONDARY" },
] as const;
const ROW_HEIGHT = 56;
const VIEWPORT_HEIGHT = 620;

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
  const [visibleCount, setVisibleCount] = useState(80);
  const [scrollTop, setScrollTop] = useState(0);
  const [loadingSlug, setLoadingSlug] = useState<string | null>(null);
  const [scrollbarWidth, setScrollbarWidth] = useState(0);
  const [radiusZip, setRadiusZip] = useState("");
  const [radiusMiles, setRadiusMiles] = useState(500);
  const [radiusEnabled, setRadiusEnabled] = useState(false);
  const bodyScrollRef = useRef<HTMLDivElement | null>(null);

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

  const chipFiltered = useMemo(() => {
    return radiusFiltered;
  }, [radiusFiltered]);

  const sorted = useMemo(() => {
    const sortedRows = [...chipFiltered].sort((a, b) => {
      if (sortKey === "name") return a.name.localeCompare(b.name);
      if (sortKey === "fitScore") return a.fitScore - b.fitScore;
      if (sortKey === "trueCol") return num(a.trueCol) - num(b.trueCol);
      if (sortKey === "medianMcat") return num(a.medianMcat) - num(b.medianMcat);
      return Number(Boolean(a.hasThreeYearTrack)) - Number(Boolean(b.hasThreeYearTrack));
    });
    if (sortDir === "desc") sortedRows.reverse();
    return sortedRows;
  }, [chipFiltered, sortDir, sortKey]);

  const loadedRows = sorted.slice(0, visibleCount);
  const totalHeight = loadedRows.length * ROW_HEIGHT;
  const startIndex = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 8);
  const endIndex = Math.min(
    loadedRows.length,
    startIndex + Math.ceil(VIEWPORT_HEIGHT / ROW_HEIGHT) + 20,
  );
  const virtualRows = loadedRows.slice(startIndex, endIndex);
  const topSpacer = startIndex * ROW_HEIGHT;
  const bottomSpacer = Math.max(0, totalHeight - topSpacer - virtualRows.length * ROW_HEIGHT);

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

  useEffect(() => {
    function computeScrollbarWidth() {
      const el = bodyScrollRef.current;
      if (!el) return;
      const width = Math.max(0, el.offsetWidth - el.clientWidth);
      setScrollbarWidth(width);
    }

    computeScrollbarWidth();
    window.addEventListener("resize", computeScrollbarWidth);
    return () => window.removeEventListener("resize", computeScrollbarWidth);
  }, [sorted.length]);

  return (
    <div className="space-y-4">
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

      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="surface overflow-hidden rounded-[1.8rem]">
          <div className="overflow-x-auto">
            <div
              className="grid min-w-[860px] grid-cols-[2.5fr_1.2fr_1.6fr_1fr_1fr_1.5fr] border-b border-white/10 px-3 py-3 text-[11px] uppercase tracking-[0.18em] text-slate-400"
              style={{ paddingRight: `${12 + scrollbarWidth}px` }}
            >
              <button type="button" onClick={() => onSort("name")} className="text-left">Name</button>
              <button type="button" onClick={() => onSort("fitScore")} className="text-right">Holistic Fit Score</button>
              <button type="button" onClick={() => onSort("trueCol")} className="text-right">True COL (Tuition + Rent)</button>
              <button type="button" onClick={() => onSort("medianMcat")} className="text-right">Median MCAT</button>
              <button type="button" onClick={() => onSort("hasThreeYearTrack")} className="text-center">3-Year MD</button>
              <div className="text-right">My Cycle</div>
            </div>
            <div
              ref={bodyScrollRef}
              className="scroll-area overflow-y-auto"
              style={{ height: VIEWPORT_HEIGHT }}
              onScroll={(e) => {
                const top = e.currentTarget.scrollTop;
                setScrollTop(top);
                const nearBottom =
                  top + e.currentTarget.clientHeight >= e.currentTarget.scrollHeight - 180;
                if (nearBottom) {
                  setVisibleCount((c) => Math.min(c + 40, sorted.length));
                }
              }}
            >
              <div style={{ height: topSpacer }} />
              {virtualRows.map((row) => (
                <div
                  key={row.id}
                  className="grid h-14 min-w-[860px] grid-cols-[2.5fr_1.2fr_1.6fr_1fr_1fr_1.5fr] items-center border-b border-white/6 px-3 text-sm"
                >
                  <div className="truncate text-slate-100" title={row.name}>{row.name}</div>
                  <div className={`text-right font-semibold ${fitTone(row.fitScore)}`}>{Math.round(row.fitScore)}</div>
                  <div className="text-right text-slate-300">{formatCurrency(row.trueCol)}</div>
                  <div className="text-right text-slate-300">
                    {row.medianMcatRaw == null ? "No data" : row.medianMcat}
                  </div>
                  <div className="text-center text-slate-200">
                    {row.hasThreeYearTrackRaw == null ? "No data" : row.hasThreeYearTrack ? "✔" : "—"}
                  </div>
                  <div className="flex justify-end">
                    <select
                      onChange={(e) => void quickCycle(row.slug, e.target.value as "CONSIDERING" | "APPLY" | "SECONDARY")}
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
                  </div>
                </div>
              ))}
              <div style={{ height: bottomSpacer }} />
            </div>
          </div>
        </section>

        <aside className="sticky top-24 h-[760px]">
          <SchoolMap schools={mapRows} />
        </aside>
      </div>
    </div>
  );
}

