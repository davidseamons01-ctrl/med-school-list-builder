import Link from "next/link";
import { getExplorerSchoolsAction, addSchoolToListAction, getProfileBundle } from "../actions";
import { SchoolMap } from "@/components/SchoolMap";
import { formatCurrency, formatPercent } from "@/lib/format";
import { computeFitScore } from "@/lib/scoring";

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; control?: string; state?: string; saved?: string }>;
}) {
  const params = await searchParams;
  const bundle = await getProfileBundle();
  const schools = await getExplorerSchoolsAction({
    q: params.q,
    control: params.control,
    state: params.state,
    onlySaved: params.saved === "1",
  });

  const summaries = schools
    .map((school) => {
      const fit = computeFitScore({
        stats: bundle.profile.stats,
        prefs: bundle.profile.prefs,
        weights: bundle.profile.weights,
        wars: bundle.profile.wars,
        school,
      });
      return {
        slug: school.slug,
        id: school.id,
        name: school.name,
        city: school.city,
        state: school.state,
        control: school.control,
        lat: school.lat,
        lng: school.lng,
        score: fit.composite,
        breakdown: fit.breakdown,
        tier: fit.statTier,
        annualCost: fit.annualCost,
        coverage: fit.breakdown.sourceCoverage,
        school,
      };
    })
    .sort((a, b) => b.score - a.score);

  const uniqueStates = [...new Set(schools.map((school) => school.state))].sort();

  return (
    <div className="space-y-6">
      <section className="surface rounded-[2rem] p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Explorer</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              ArcGIS map + ranked school explorer
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
              Every school is seeded with public AAMC tuition facts and a curated research link scaffold. The fit score
              below blends your profile with location, mission notes, cost, and current data coverage.
            </p>
          </div>
          <form method="get" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            <input
              name="q"
              placeholder="School, city, or state"
              defaultValue={params.q ?? ""}
              className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white"
            />
            <select
              name="control"
              defaultValue={params.control ?? ""}
              className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white"
            >
              <option value="">Any control</option>
              <option value="PUBLIC">Public</option>
              <option value="PRIVATE">Private</option>
              <option value="FEDERAL">Federal</option>
            </select>
            <select
              name="state"
              defaultValue={params.state ?? ""}
              className="rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-white"
            >
              <option value="">All states</option>
              {uniqueStates.map((state) => (
                <option key={state} value={state}>
                  {state}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-sm text-slate-300">
              <input type="checkbox" name="saved" value="1" defaultChecked={params.saved === "1"} className="h-4 w-4" />
              Saved only
            </label>
            <button
              type="submit"
              className="rounded-2xl bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Update explorer
            </button>
          </form>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <SchoolMap schools={summaries} />

        <section className="surface scroll-area max-h-[640px] overflow-y-auto rounded-[2rem] p-4">
          <div className="mb-4 flex items-center justify-between gap-4 px-2">
            <div>
              <h2 className="text-lg font-semibold text-white">Best-fit schools in current filter</h2>
              <p className="mt-1 text-sm text-slate-400">{summaries.length} schools shown</p>
            </div>
          </div>
          <div className="space-y-3">
            {summaries.map((school) => (
              <article
                key={school.id}
                className="rounded-[1.6rem] border border-white/8 bg-white/4 p-4 transition hover:border-cyan-400/25 hover:bg-white/6"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <Link href={`/schools/${school.slug}`} className="text-base font-semibold text-white hover:text-cyan-200">
                      {school.name}
                    </Link>
                    <p className="mt-1 text-sm text-slate-400">
                      {school.city}, {school.state} · {school.control.toLowerCase()}
                    </p>
                  </div>
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                    {school.tier}
                  </span>
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/8 bg-slate-950/50 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Fit score</p>
                    <p className="mt-2 text-xl font-semibold text-white">{formatPercent(school.score)}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Coverage {formatPercent(school.coverage)} · Flags {school.breakdown.flags.length}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/8 bg-slate-950/50 p-3">
                    <p className="text-xs uppercase tracking-[0.18em] text-slate-500">AAMC annual cost</p>
                    <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(school.annualCost)}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      Residency-aware using {bundle.profile.stats.residencyState || "your state"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {school.breakdown.flags.slice(0, 3).map((flag) => (
                    <span
                      key={flag}
                      className="rounded-full border border-amber-400/20 bg-amber-400/10 px-2.5 py-1 text-[11px] text-amber-200"
                    >
                      {flag.replaceAll("_", " ")}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <Link
                    href={`/schools/${school.slug}`}
                    className="text-sm font-medium text-cyan-300 hover:text-cyan-200"
                  >
                    Open research desk
                  </Link>
                  <form
                    action={async () => {
                      "use server";
                      await addSchoolToListAction(school.slug);
                    }}
                  >
                    <button
                      type="submit"
                      className="rounded-full border border-white/10 px-3 py-2 text-xs font-medium text-slate-200 hover:border-white/20 hover:bg-white/5"
                    >
                      Add / refresh list
                    </button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

