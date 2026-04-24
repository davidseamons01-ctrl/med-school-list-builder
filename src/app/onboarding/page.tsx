import { getProfileBundle, updateProfileAction } from "../actions";
import { MISSION_TAG_OPTIONS } from "@/lib/types";

function sliderLabel(value: number) {
  if (value <= 2) return "Low";
  if (value === 3) return "Medium";
  if (value === 4) return "High";
  return "Very high";
}

export default async function OnboardingPage() {
  const { profile } = await getProfileBundle();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="surface rounded-[2rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Applicant profile</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Tune the scoring to your life, not just your stats.</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          This profile powers the fit score, list tiers, and ArcGIS explorer summaries. It is designed to care about
          family logistics, cost pressure, and geography as much as the usual premed metrics.
        </p>
      </div>

      <form action={updateProfileAction} className="space-y-6">
        <section className="surface rounded-[2rem] p-6">
          <h2 className="text-lg font-semibold text-white">Identity and academic context</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <label className="text-sm text-slate-300">
              Display name
              <input
                name="displayName"
                defaultValue={profile.displayName ?? "Applicant"}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
              />
            </label>
            <label className="text-sm text-slate-300">
              cGPA
              <input
                name="cgpa"
                type="number"
                step="0.01"
                defaultValue={profile.stats.cgpa}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
              />
            </label>
            <label className="text-sm text-slate-300">
              sGPA
              <input
                name="sgpa"
                type="number"
                step="0.01"
                defaultValue={profile.stats.sgpa}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
              />
            </label>
            <label className="text-sm text-slate-300">
              MCAT
              <input
                name="mcat"
                type="number"
                defaultValue={profile.stats.mcat}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
              />
            </label>
            <label className="text-sm text-slate-300">
              Legal residency
              <input
                name="residencyState"
                maxLength={2}
                defaultValue={profile.stats.residencyState}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 uppercase text-white"
              />
            </label>
            <label className="text-sm text-slate-300">
              Program type
              <input
                name="programType"
                defaultValue={profile.stats.programType}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
              />
            </label>
            <label className="text-sm text-slate-300 md:col-span-2">
              Specialty interest
              <input
                name="specialtyInterest"
                defaultValue={profile.stats.specialtyInterest}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
              />
            </label>
          </div>
        </section>

        <section className="surface rounded-[2rem] p-6">
          <h2 className="text-lg font-semibold text-white">Mission, geography, and family reality</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <label className="text-sm text-slate-300">
              Mission tags (comma-separated)
              <input
                name="missionTags"
                defaultValue={profile.prefs.missionTags.join(", ")}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
              />
              <span className="mt-2 block text-xs text-slate-500">{MISSION_TAG_OPTIONS.join(", ")}</span>
            </label>
            <label className="text-sm text-slate-300">
              Preferred states
              <input
                name="preferStates"
                defaultValue={profile.prefs.preferStates.join(", ")}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
              />
            </label>
            <label className="text-sm text-slate-300">
              Avoid states
              <input
                name="avoidStates"
                defaultValue={profile.prefs.avoidStates.join(", ")}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
              />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="text-sm text-slate-300">
                Adults in household
                <input
                  name="householdAdults"
                  type="number"
                  defaultValue={profile.prefs.householdAdults}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
                />
              </label>
              <label className="text-sm text-slate-300">
                Children in household
                <input
                  name="householdChildren"
                  type="number"
                  defaultValue={profile.prefs.householdChildren}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
                />
              </label>
            </div>
            <label className="text-sm text-slate-300">
              Monthly housing budget
              <input
                name="monthlyHousingBudget"
                type="number"
                defaultValue={profile.prefs.monthlyHousingBudget}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
              />
            </label>
            <label className="text-sm text-slate-300">
              Monthly area-reality budget
              <input
                name="monthlyAreaRealityBudget"
                type="number"
                defaultValue={profile.prefs.monthlyAreaRealityBudget}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
              />
            </label>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {(
              [
                { name: "familyPriority", value: profile.prefs.familyPriority, label: "Family support priority" },
                { name: "coaSensitivity", value: profile.prefs.coaSensitivity, label: "Debt / COA sensitivity" },
                {
                  name: "prestigeResearchWeight",
                  value: profile.prefs.prestigeResearchWeight,
                  label: "Prestige / research emphasis",
                },
              ] as const
            ).map(({ name, value, label }) => (
              <label key={name} className="rounded-3xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
                <div className="flex items-center justify-between gap-4">
                  <span>{label}</span>
                  <span className="text-xs uppercase tracking-[0.18em] text-cyan-300">
                    {sliderLabel(Number(value))}
                  </span>
                </div>
                <input
                  name={name}
                  type="range"
                  min={1}
                  max={5}
                  step={1}
                  defaultValue={Number(value)}
                  className="mt-4 w-full accent-cyan-400"
                />
              </label>
            ))}
          </div>
          <label className="mt-5 flex items-center gap-3 text-sm text-slate-300">
            <input type="hidden" name="wantsArcGisExplorer" value="off" />
            <input
              type="checkbox"
              name="wantsArcGisExplorer"
              value="on"
              defaultChecked={profile.prefs.wantsArcGisExplorer}
              className="h-4 w-4"
            />
            Use the spatial ArcGIS explorer as a primary planning tool
          </label>
        </section>

        <section className="surface rounded-[2rem] p-6">
          <h2 className="text-lg font-semibold text-white">How the score should think</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-5">
            {(
              [
                { name: "w_stats", value: profile.weights.stats, label: "Stats" },
                { name: "w_mission", value: profile.weights.mission, label: "Mission fit" },
                { name: "w_colFamily", value: profile.weights.colFamily, label: "Cost / family fit" },
                { name: "w_geography", value: profile.weights.geography, label: "Geography" },
                { name: "w_research", value: profile.weights.research, label: "Research / prestige" },
              ] as const
            ).map(({ name, value, label }) => (
              <label key={name} className="text-sm text-slate-300">
                {label}
                <input
                  name={name}
                  type="number"
                  step="0.01"
                  defaultValue={Number(value)}
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
                />
              </label>
            ))}
          </div>
          <p className="mt-4 text-sm text-slate-400">
            These are normalized at scoring time so you can keep rough proportions instead of forcing them to sum to
            one manually.
          </p>
        </section>

        <section className="surface rounded-[2rem] p-6">
          <h2 className="text-lg font-semibold text-white">WARS-style context inputs</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-4">
            <label className="text-sm text-slate-300">
              Clinical hours
              <input
                name="clinicalHours"
                type="number"
                defaultValue={profile.wars.clinicalHours}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
              />
            </label>
            <label className="text-sm text-slate-300">
              Research hours
              <input
                name="researchHours"
                type="number"
                defaultValue={profile.wars.researchHours}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
              />
            </label>
            <label className="text-sm text-slate-300">
              Volunteering hours
              <input
                name="volunteeringHours"
                type="number"
                defaultValue={profile.wars.volunteeringHours}
                className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
              />
            </label>
            <label className="flex items-end gap-3 rounded-3xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
              <input type="hidden" name="leadershipFlag" value="off" />
              <input type="checkbox" name="leadershipFlag" value="on" defaultChecked={profile.wars.leadershipFlag} className="h-4 w-4" />
              Leadership roles present
            </label>
          </div>
        </section>

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Save profile
          </button>
        </div>
      </form>
    </div>
  );
}

