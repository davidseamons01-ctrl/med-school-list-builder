import Link from "next/link";
import { getListEntriesAction, getProfileBundle, recomputeListScoresAction, updateListEntryFormAction } from "../actions";
import { formatCurrency, formatPercent } from "@/lib/format";
import { getResidencyAwareAnnualCost } from "@/lib/scoring";

const tiers = ["BASELINE", "TARGET", "REACH"] as const;
const statuses = ["NONE", "CONSIDERING", "APPLY", "SECONDARY", "INTERVIEW", "ACCEPTED", "WITHDRAWN", "SKIP"] as const;

export default async function ComparePage() {
  const { entries } = await getListEntriesAction();
  const { profile } = await getProfileBundle();

  return (
    <div className="space-y-6">
      <section className="surface rounded-[2rem] p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Compare board</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Organize baseline, target, and reach schools without losing the lived-context details.</h1>
          </div>
          <form
            action={async () => {
              "use server";
              await recomputeListScoresAction();
            }}
          >
            <button className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
              Recompute from profile
            </button>
          </form>
        </div>
      </section>

      {entries.length === 0 ? (
        <div className="surface rounded-[2rem] p-8 text-sm text-slate-300">
          No schools saved yet. Start in the <Link href="/schools" className="text-cyan-300">explorer</Link>.
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-3">
          {tiers.map((tier) => (
            <section key={tier} className="surface rounded-[2rem] p-4">
              <div className="mb-4 flex items-center justify-between gap-4 px-2">
                <div>
                  <h2 className="text-lg font-semibold text-white">{tier}</h2>
                  <p className="text-sm text-slate-400">
                    {entries.filter((entry) => entry.tier === tier).length} schools
                  </p>
                </div>
              </div>
              <div className="space-y-3">
                {entries
                  .filter((entry) => entry.tier === tier)
                  .map((entry) => {
                    const annualCost = getResidencyAwareAnnualCost(
                      entry.school.facts,
                      profile.stats.residencyState,
                      entry.school.state,
                    );
                    return (
                      <article key={entry.id} className="rounded-[1.5rem] border border-white/8 bg-white/4 p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <Link href={`/schools/${entry.school.slug}`} className="font-semibold text-white hover:text-cyan-200">
                              {entry.school.name}
                            </Link>
                            <p className="mt-1 text-sm text-slate-400">
                              {entry.school.city}, {entry.school.state}
                            </p>
                          </div>
                          <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200">
                            {formatPercent(entry.compositeScore)}
                          </span>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-3 text-sm text-slate-300">
                          <span>AAMC annual {formatCurrency(annualCost)}</span>
                          <span>Status {entry.applyStatus.toLowerCase()}</span>
                        </div>
                        <form action={updateListEntryFormAction} className="mt-4 space-y-3">
                          <input type="hidden" name="schoolId" value={entry.schoolId} />
                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="text-xs text-slate-400">
                              Tier
                              <select
                                name="tier"
                                defaultValue={entry.tier}
                                className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white"
                              >
                                {tiers.map((option) => (
                                  <option key={option} value={option}>
                                    {option}
                                  </option>
                                ))}
                              </select>
                            </label>
                            <label className="text-xs text-slate-400">
                              Status
                              <select
                                name="applyStatus"
                                defaultValue={entry.applyStatus}
                                className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white"
                              >
                                {statuses.map((status) => (
                                  <option key={status} value={status}>
                                    {status}
                                  </option>
                                ))}
                              </select>
                            </label>
                          </div>
                          <label className="flex items-center gap-2 text-xs text-slate-400">
                            <input type="hidden" name="tierOverride" value="off" />
                            <input type="checkbox" name="tierOverride" value="on" defaultChecked={entry.tierOverride} />
                            Pin this tier
                          </label>
                          <label className="block text-xs text-slate-400">
                            Notes
                            <textarea
                              name="notes"
                              rows={3}
                              defaultValue={entry.notes ?? ""}
                              className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white"
                            />
                          </label>
                          <label className="block text-xs text-slate-400">
                            Checklist JSON
                            <textarea
                              name="checklistJson"
                              rows={3}
                              defaultValue={entry.checklistJson ?? ""}
                              className="mt-1 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2 font-mono text-xs text-white"
                            />
                          </label>
                          <button className="rounded-full border border-white/10 px-4 py-2 text-xs font-medium text-slate-200 hover:border-white/20 hover:bg-white/5">
                            Save card
                          </button>
                        </form>
                      </article>
                    );
                  })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

