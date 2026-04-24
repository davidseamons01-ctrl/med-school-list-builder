import Link from "next/link";
import { notFound } from "next/navigation";
import {
  addSchoolResourceFormAction,
  addSchoolToListAction,
  getProfileBundle,
  getSchoolDetailAction,
  importMsarFormAction,
  updateSchoolMetaFormAction,
  updateListEntryFormAction,
  upsertSchoolFactFormAction,
} from "@/app/actions";
import { SchoolMap } from "@/components/SchoolMap";
import { formatCurrency, formatPercent, titleizeKey } from "@/lib/format";
import { computeFitScore, getFactNumber, parseFactValue } from "@/lib/scoring";

function groupByCategory<T extends { category: string }>(items: T[]) {
  return items.reduce<Record<string, T[]>>((acc, item) => {
    (acc[item.category] ??= []).push(item);
    return acc;
  }, {});
}

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const school = await getSchoolDetailAction(slug);
  if (!school) notFound();

  const bundle = await getProfileBundle();
  const fit = computeFitScore({
    stats: bundle.profile.stats,
    prefs: bundle.profile.prefs,
    weights: bundle.profile.weights,
    wars: bundle.profile.wars,
    school,
  });

  const resourcesByCategory = groupByCategory(school.resources);
  const factsByCategory = groupByCategory(school.facts);
  const residentAnnual = getFactNumber(school.facts, "aamc_2025_2026_total_resident");
  const nonresidentAnnual = getFactNumber(school.facts, "aamc_2025_2026_total_nonresident");
  const listEntry = school.listEntries[0];
  const singleMapSchool = [
    {
      slug: school.slug,
      name: school.name,
      city: school.city,
      state: school.state,
      control: school.control,
      lat: school.lat,
      lng: school.lng,
      score: fit.composite,
      annualCost: fit.annualCost,
      tier: fit.statTier,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="surface rounded-[2rem] p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
              Research desk
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{school.name}</h1>
            <p className="mt-3 text-sm text-slate-300">
              {school.city}, {school.state} · {school.control.toLowerCase()} · {school.resources.length} preloaded research
              links
            </p>
          </div>
          <form
            action={async () => {
              "use server";
              await addSchoolToListAction(school.slug);
            }}
          >
            <button
              type="submit"
              className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Add / refresh in list
            </button>
          </form>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-4">
          <div className="metric-card rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Fit score</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatPercent(fit.composite)}</p>
            <p className="mt-2 text-sm text-slate-400">Suggested tier {fit.statTier}</p>
          </div>
          <div className="metric-card rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">AAMC resident annual</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(residentAnnual)}</p>
            <p className="mt-2 text-sm text-slate-400">Public workbook 2025-2026</p>
          </div>
          <div className="metric-card rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">AAMC nonresident annual</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatCurrency(nonresidentAnnual)}</p>
            <p className="mt-2 text-sm text-slate-400">Public workbook 2025-2026</p>
          </div>
          <div className="metric-card rounded-3xl p-5">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Source coverage</p>
            <p className="mt-3 text-3xl font-semibold text-white">{formatPercent(fit.breakdown.sourceCoverage)}</p>
            <p className="mt-2 text-sm text-slate-400">{fit.breakdown.flags.join(" · ") || "No warnings"}</p>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-6">
          <SchoolMap schools={singleMapSchool} />

          <section className="surface rounded-[2rem] p-6">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-lg font-semibold text-white">Hard numbers and source trail</h2>
              <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-slate-300">
                {school.facts.length} fact rows
              </span>
            </div>
            <div className="mt-5 grid gap-3">
              {Object.entries(factsByCategory).map(([category, facts]) => (
                <div key={category} className="rounded-3xl border border-white/8 bg-slate-950/50 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">{titleizeKey(category)}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {facts.map((fact) => {
                      const parsed = parseFactValue(fact);
                      const display =
                        fact.valueType === "currency" && typeof parsed === "number"
                          ? formatCurrency(parsed)
                          : String(parsed ?? fact.valueJson);
                      return (
                        <div key={fact.id} className="rounded-2xl border border-white/8 bg-white/4 p-4">
                          <p className="text-sm font-medium text-white">{fact.label}</p>
                          <p className="mt-2 text-xl font-semibold text-slate-100">{display}</p>
                          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-400">
                            <span className="rounded-full border border-white/10 px-2 py-1">
                              {fact.sourceType}
                            </span>
                            {fact.sourceLabel && (
                              <span className="rounded-full border border-white/10 px-2 py-1">
                                {fact.sourceLabel}
                              </span>
                            )}
                            {fact.retrievedAt && (
                              <span className="rounded-full border border-white/10 px-2 py-1">
                                {new Date(fact.retrievedAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          {fact.sourceUrl && (
                            <a
                              href={fact.sourceUrl}
                              className="mt-3 inline-block text-sm text-cyan-300 hover:text-cyan-200"
                            >
                              Open source
                            </a>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="surface rounded-[2rem] p-6">
            <h2 className="text-lg font-semibold text-white">Preloaded research links</h2>
            <div className="mt-5 space-y-4">
              {Object.entries(resourcesByCategory).map(([category, resources]) => (
                <div key={category} className="rounded-3xl border border-white/8 bg-slate-950/45 p-4">
                  <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">{titleizeKey(category)}</p>
                  <div className="mt-4 grid gap-3 lg:grid-cols-2">
                    {resources.map((resource) => (
                      <a
                        key={resource.id}
                        href={resource.url}
                        className="rounded-2xl border border-white/8 bg-white/4 p-4 transition hover:border-cyan-400/20 hover:bg-white/7"
                      >
                        <p className="text-sm font-medium text-white">{resource.label}</p>
                        <p className="mt-1 text-xs uppercase tracking-[0.18em] text-slate-500">
                          {resource.provider}
                        </p>
                        {resource.description && (
                          <p className="mt-3 text-sm leading-6 text-slate-300">{resource.description}</p>
                        )}
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="surface rounded-[2rem] p-6">
            <h2 className="text-lg font-semibold text-white">List planning</h2>
            <form action={updateListEntryFormAction} className="mt-5 space-y-4">
              <input type="hidden" name="schoolId" value={school.id} />
              <label className="block text-sm text-slate-300">
                Tier
                <select
                  name="tier"
                  defaultValue={listEntry?.tier ?? fit.statTier}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
                >
                  <option value="BASELINE">BASELINE</option>
                  <option value="TARGET">TARGET</option>
                  <option value="REACH">REACH</option>
                </select>
              </label>
              <label className="flex items-center gap-3 text-sm text-slate-300">
                <input type="hidden" name="tierOverride" value="off" />
                <input type="checkbox" name="tierOverride" value="on" defaultChecked={listEntry?.tierOverride ?? false} />
                Pin this tier instead of using recomputed tier
              </label>
              <label className="block text-sm text-slate-300">
                Apply status
                <select
                  name="applyStatus"
                  defaultValue={listEntry?.applyStatus ?? "CONSIDERING"}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
                >
                  {["NONE", "CONSIDERING", "APPLY", "SECONDARY", "INTERVIEW", "ACCEPTED", "WITHDRAWN", "SKIP"].map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block text-sm text-slate-300">
                Notes
                <textarea
                  name="notes"
                  rows={4}
                  defaultValue={listEntry?.notes ?? ""}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
                />
              </label>
              <label className="block text-sm text-slate-300">
                Research checklist JSON
                <textarea
                  name="checklistJson"
                  rows={4}
                  defaultValue={listEntry?.checklistJson ?? "[\"Official class profile\", \"Student affairs family page\", \"Neighborhood rent search\"]"}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 font-mono text-xs text-white"
                />
              </label>
              <button
                type="submit"
                className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
              >
                Save planning fields
              </button>
            </form>
          </section>

          <details className="surface rounded-[2rem] p-6">
            <summary className="cursor-pointer text-lg font-semibold text-white">Verify / extend school data</summary>
            <div className="mt-5 space-y-6">
              <form action={importMsarFormAction} className="space-y-3">
                <input type="hidden" name="schoolId" value={school.id} />
                <input type="hidden" name="schoolSlug" value={school.slug} />
                <label className="block text-sm text-slate-300">
                  Import MSAR-like JSON
                  <textarea
                    name="payload"
                    rows={4}
                    defaultValue='{"median_mcat":518,"median_cgpa":3.9,"median_grad_debt":135000,"pct_receiving_aid":62}'
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 font-mono text-xs text-white"
                  />
                </label>
                <button className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 hover:border-white/20 hover:bg-white/5">
                  Import hard numbers
                </button>
              </form>

              <form action={upsertSchoolFactFormAction} className="grid gap-3">
                <input type="hidden" name="schoolId" value={school.id} />
                <input type="hidden" name="schoolSlug" value={school.slug} />
                <input type="hidden" name="category" value="hard_numbers" />
                <input type="hidden" name="valueType" value="number" />
                <input type="hidden" name="sourceType" value="USER_MANUAL" />
                <label className="text-sm text-slate-300">
                  Fact key
                  <input name="key" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  Label
                  <input name="label" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  Value
                  <input name="value" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  Source label
                  <input name="sourceLabel" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  Source URL
                  <input name="sourceUrl" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white" />
                </label>
                <button className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 hover:border-white/20 hover:bg-white/5">
                  Save fact
                </button>
              </form>

              <form action={updateSchoolMetaFormAction} className="grid gap-3">
                <input type="hidden" name="schoolId" value={school.id} />
                <input type="hidden" name="schoolSlug" value={school.slug} />
                <label className="text-sm text-slate-300">
                  Official website
                  <input name="websiteUrl" defaultValue={school.websiteUrl ?? ""} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  Admissions URL
                  <input name="admissionsUrl" defaultValue={school.admissionsUrl ?? ""} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  Student affairs / family resources
                  <input name="studentAffairsUrl" defaultValue={school.studentAffairsUrl ?? ""} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  Financial aid URL
                  <input name="financialAidUrl" defaultValue={school.financialAidUrl ?? ""} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  Mission tags / notes
                  <textarea name="missionTagNotes" rows={3} defaultValue={school.missionTagNotes ?? ""} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white" />
                </label>
                <button className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 hover:border-white/20 hover:bg-white/5">
                  Save metadata
                </button>
              </form>

              <form action={addSchoolResourceFormAction} className="grid gap-3">
                <input type="hidden" name="schoolId" value={school.id} />
                <input type="hidden" name="schoolSlug" value={school.slug} />
                <label className="text-sm text-slate-300">
                  Manual research link label
                  <input name="label" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  URL
                  <input name="url" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  Category
                  <input name="category" defaultValue="manual_curation" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  Provider
                  <input name="provider" defaultValue="Manual" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  Kind
                  <input name="kind" defaultValue="manual_link" className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white" />
                </label>
                <label className="text-sm text-slate-300">
                  Description
                  <textarea name="description" rows={2} className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white" />
                </label>
                <button className="rounded-full border border-white/10 px-4 py-2 text-sm text-slate-200 hover:border-white/20 hover:bg-white/5">
                  Add resource
                </button>
              </form>
            </div>
          </details>
        </aside>
      </div>

      <p className="text-sm text-slate-400">
        <Link href="/schools" className="text-cyan-300 hover:text-cyan-200">
          Back to explorer
        </Link>
      </p>
    </div>
  );
}

