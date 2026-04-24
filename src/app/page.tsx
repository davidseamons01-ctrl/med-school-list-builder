import Link from "next/link";
import { ArrowRight, Database, DollarSign, MapPinned, ShieldCheck } from "lucide-react";
import { getDashboardDataAction } from "./actions";
import { formatCurrency } from "@/lib/format";
import { getResidencyAwareAnnualCost, lizzym, warsTierBand } from "@/lib/scoring";
import { ApplicantAiProfileCard } from "@/components/ai/ApplicantAiProfileCard";

export default async function DashboardPage() {
  const { bundle, listData, schoolsCount, factsCount, resourcesCount } =
    await getDashboardDataAction();

  const lizzy = lizzym(bundle.profile.stats);
  const wars = warsTierBand(bundle.profile.wars);

  const topEntries = listData.entries.slice(0, 6).map((entry) => ({
    ...entry,
    annualCost: getResidencyAwareAnnualCost(
      entry.school.facts,
      bundle.profile.stats.residencyState,
      entry.school.state,
    ),
  }));

  const tierCounts = listData.entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.tier] = (acc[entry.tier] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <section className="surface overflow-hidden rounded-[2rem] p-8">
        <div className="grid gap-10 lg:grid-cols-[1.25fr_0.75fr]">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Smart list planning
            </p>
            <h1 className="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Research-heavy medical school planning with real cost data, source trails, and spatial context.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-slate-300">
              This build now seeds the full US MD roster, public AAMC tuition and fee data, and preloaded research
              links for official pages, housing, family life, Reddit, SDN, YouTube, and Google Maps. The goal is less
              prestige theater and more grounded decision-making.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/schools"
                className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Open ArcGIS explorer
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/onboarding"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 transition hover:border-white/20 hover:bg-white/5"
              >
                Refine applicant profile
              </Link>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="metric-card rounded-3xl p-5">
              <div className="flex items-center gap-3 text-cyan-300">
                <Database className="h-5 w-5" />
                <span className="text-sm font-medium">Seeded coverage</span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">{schoolsCount}</p>
              <p className="mt-1 text-sm text-slate-400">MD schools in roster</p>
              <p className="mt-4 text-sm text-slate-300">
                {factsCount.toLocaleString()} fact rows · {resourcesCount.toLocaleString()} research links
              </p>
            </div>
            <div className="metric-card rounded-3xl p-5">
              <div className="flex items-center gap-3 text-emerald-300">
                <DollarSign className="h-5 w-5" />
                <span className="text-sm font-medium">Applicant heuristic</span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">{bundle.profile.stats.mcat}</p>
              <p className="mt-1 text-sm text-slate-400">
                cGPA {bundle.profile.stats.cgpa} · LizzyM {lizzy.toFixed(1)}
              </p>
              <p className="mt-4 text-sm text-slate-300">WARS-style band: {wars}</p>
            </div>
            <div className="metric-card rounded-3xl p-5">
              <div className="flex items-center gap-3 text-indigo-300">
                <MapPinned className="h-5 w-5" />
                <span className="text-sm font-medium">Living reality</span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">
                {formatCurrency(bundle.profile.prefs.monthlyAreaRealityBudget)}
              </p>
              <p className="mt-1 text-sm text-slate-400">Monthly “what does this actually feel like?” budget</p>
              <p className="mt-4 text-sm text-slate-300">
                {bundle.profile.prefs.householdAdults} adults · {bundle.profile.prefs.householdChildren} children
              </p>
            </div>
            <div className="metric-card rounded-3xl p-5">
              <div className="flex items-center gap-3 text-amber-300">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm font-medium">Saved list</span>
              </div>
              <p className="mt-4 text-3xl font-semibold text-white">{listData.entries.length}</p>
              <p className="mt-1 text-sm text-slate-400">
                Baseline {tierCounts.BASELINE ?? 0} · Target {tierCounts.TARGET ?? 0} · Reach{" "}
                {tierCounts.REACH ?? 0}
              </p>
              <p className="mt-4 text-sm text-slate-300">Pin tiers manually if you disagree with the heuristic.</p>
            </div>
          </div>
        </div>
      </section>

      <ApplicantAiProfileCard
        fallbackMcat={bundle.profile.stats.mcat}
        fallbackCgpa={bundle.profile.stats.cgpa}
        fallbackResidencyState={bundle.profile.stats.residencyState}
        fallbackMissionTags={bundle.profile.prefs.missionTags}
        fallbackSpecialtyInterest={bundle.profile.stats.specialtyInterest}
      />

      <section className="grid gap-6 lg:grid-cols-[1fr_1.1fr]">
        <div className="surface rounded-[2rem] p-6">
          <h2 className="text-lg font-semibold text-white">Profile snapshot</h2>
          <dl className="mt-5 space-y-4 text-sm text-slate-300">
            <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
              <dt>Residency</dt>
              <dd>{bundle.profile.stats.residencyState || "Not set"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
              <dt>Specialty leaning</dt>
              <dd>{bundle.profile.stats.specialtyInterest.replaceAll("_", " ")}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
              <dt>Mission tags</dt>
              <dd className="text-right">{bundle.profile.prefs.missionTags.join(", ") || "None yet"}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-white/5 pb-3">
              <dt>Preferred states</dt>
              <dd>{bundle.profile.prefs.preferStates.join(", ") || "None"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Avoid states</dt>
              <dd>{bundle.profile.prefs.avoidStates.join(", ") || "None"}</dd>
            </div>
          </dl>
        </div>

        <div className="surface rounded-[2rem] p-6">
          <div className="flex items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">Top saved schools</h2>
            <Link href="/compare" className="text-sm text-cyan-300 hover:text-cyan-200">
              Open compare board
            </Link>
          </div>
          <div className="mt-5 space-y-3">
            {topEntries.length === 0 ? (
              <p className="text-sm text-slate-400">
                Nothing saved yet. Start in the explorer and add schools into your working list.
              </p>
            ) : (
              topEntries.map((entry) => (
                <Link
                  key={entry.id}
                  href={`/schools/${entry.school.slug}`}
                  className="block rounded-2xl border border-white/6 bg-white/4 p-4 transition hover:border-cyan-400/30 hover:bg-white/8"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-white">{entry.school.name}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {entry.school.city}, {entry.school.state}
                      </p>
                    </div>
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium text-cyan-200">
                      {entry.tier}
                    </span>
                  </div>
                  <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-300">
                    <span>Fit {entry.compositeScore ? Math.round(entry.compositeScore * 100) : 0}%</span>
                    <span>Annual cost {formatCurrency(entry.annualCost)}</span>
                    <span>Status {entry.applyStatus.toLowerCase()}</span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

