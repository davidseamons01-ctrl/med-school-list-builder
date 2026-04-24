"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Sparkles, CheckCircle2, Loader2, AlertTriangle, Pause } from "lucide-react";

type Stats = {
  totalSchools: number;
  profiledSchools: number;
  missingCount: number;
};

type MissingEntry = { slug: string; name: string; state: string };

type Progress = {
  done: number;
  total: number;
  current: string | null;
  failures: Array<{ slug: string; error: string }>;
};

const INITIAL_PROGRESS: Progress = { done: 0, total: 0, current: null, failures: [] };

export function SchoolMissionIngestCard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState<Progress>(INITIAL_PROGRESS);
  const cancelRef = useRef(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/generate-school-missions", { cache: "no-store" });
      if (!res.ok) throw new Error(`stats request failed: ${res.status}`);
      const data = (await res.json()) as Stats;
      setStats(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load stats");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const startBatch = useCallback(async () => {
    setError(null);
    cancelRef.current = false;
    setRunning(true);
    setProgress(INITIAL_PROGRESS);
    try {
      const listRes = await fetch(
        "/api/ai/generate-school-missions?listMissing=true",
        { cache: "no-store" },
      );
      if (!listRes.ok) throw new Error(`could not list schools: ${listRes.status}`);
      const listData = (await listRes.json()) as Stats & { missing: MissingEntry[] };
      const missing = listData.missing ?? [];
      setProgress({ done: 0, total: missing.length, current: null, failures: [] });

      for (const entry of missing) {
        if (cancelRef.current) break;
        setProgress((p) => ({ ...p, current: entry.name }));
        try {
          const r = await fetch("/api/ai/generate-school-missions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ slug: entry.slug }),
          });
          if (!r.ok) {
            const text = await r.text();
            setProgress((p) => ({
              ...p,
              failures: [
                ...p.failures,
                { slug: entry.slug, error: `${r.status} ${text.slice(0, 80)}` },
              ],
            }));
          }
        } catch (err) {
          setProgress((p) => ({
            ...p,
            failures: [
              ...p.failures,
              { slug: entry.slug, error: err instanceof Error ? err.message : "request failed" },
            ],
          }));
        }
        setProgress((p) => ({ ...p, done: p.done + 1 }));
      }
      setProgress((p) => ({ ...p, current: null }));
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch failed");
    } finally {
      setRunning(false);
    }
  }, [refresh]);

  const cancel = () => {
    cancelRef.current = true;
  };

  const progressPct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const allDone = stats != null && stats.missingCount === 0;

  return (
    <section className="surface rounded-[1.6rem] p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/40 bg-cyan-400/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-cyan-200">
            <Sparkles className="h-3.5 w-3.5" /> School mission analysis
          </div>
          <h3 className="mt-3 text-lg font-semibold text-white">
            AI mission profiles for every school
          </h3>
          <p className="mt-1 text-sm text-slate-400">
            Claude reads each school&rsquo;s mission, focus areas, and matriculant profile, then
            scores it on research / service / rural / health-equity axes. These scores are cached
            in the database so every school only gets analyzed once &mdash; future holistic scores
            reuse the stored values without extra AI calls.
          </p>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <StatTile label="Total schools" value={loading ? "—" : stats?.totalSchools ?? 0} />
        <StatTile
          label="Analyzed"
          value={loading ? "—" : stats?.profiledSchools ?? 0}
          tone={allDone ? "emerald" : "cyan"}
        />
        <StatTile
          label="Remaining"
          value={loading ? "—" : stats?.missingCount ?? 0}
          tone={allDone ? "emerald" : "amber"}
        />
      </div>

      {error ? (
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-rose-400/30 bg-rose-400/10 p-3 text-xs text-rose-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 flex-none" />
          <span>{error}</span>
        </div>
      ) : null}

      {running ? (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span className="inline-flex items-center gap-2">
              <Loader2 className="h-3.5 w-3.5 animate-spin text-cyan-300" />
              {progress.current ? `Analyzing: ${progress.current}` : "Preparing…"}
            </span>
            <span>
              {progress.done} / {progress.total}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 to-indigo-400 transition-all"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          {progress.failures.length > 0 ? (
            <p className="text-xs text-amber-300">
              {progress.failures.length} school(s) failed and were skipped. You can re-run to retry.
            </p>
          ) : null}
          <button
            type="button"
            onClick={cancel}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-200 hover:bg-white/10"
          >
            <Pause className="h-3.5 w-3.5" /> Stop after current school
          </button>
        </div>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {allDone ? (
          <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1.5 text-xs font-semibold text-emerald-200">
            <CheckCircle2 className="h-4 w-4" /> All schools analyzed &amp; cached
          </span>
        ) : null}
        <button
          type="button"
          onClick={startBatch}
          disabled={loading || running || (stats?.missingCount ?? 0) === 0}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-500 to-indigo-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 transition hover:from-cyan-400 hover:to-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {running ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4" /> Analyze
              {stats?.missingCount ? ` ${stats.missingCount} remaining` : " all schools"}
            </>
          )}
        </button>
        {!running && stats && stats.missingCount > 0 ? (
          <span className="text-xs text-slate-400">
            Takes ~{Math.max(1, Math.ceil((stats.missingCount * 6) / 60))} minute(s). You can leave
            this tab open &mdash; progress is stored after each school.
          </span>
        ) : null}
      </div>
    </section>
  );
}

function StatTile({
  label,
  value,
  tone = "slate",
}: {
  label: string;
  value: number | string;
  tone?: "slate" | "cyan" | "amber" | "emerald";
}) {
  const toneClasses =
    tone === "emerald"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : tone === "cyan"
      ? "border-cyan-400/30 bg-cyan-400/10 text-cyan-200"
      : tone === "amber"
      ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
      : "border-white/10 bg-slate-950/50 text-slate-200";
  return (
    <div className={`rounded-2xl border p-4 ${toneClasses}`}>
      <p className="text-xs uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-1.5 text-2xl font-semibold">{value}</p>
    </div>
  );
}
