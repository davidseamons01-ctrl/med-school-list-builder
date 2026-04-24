import { getExplorerSchoolsAction, getProfileBundle } from "../actions";
import { DirectoryTableMapClient } from "@/components/schools/DirectoryTableMapClient";
import { computeFitScore } from "@/lib/scoring";

function parseFactNumber(valueJson: string | undefined): number | null {
  if (!valueJson) return null;
  try {
    const parsed = JSON.parse(valueJson);
    if (typeof parsed === "number" && Number.isFinite(parsed)) return parsed;
    if (typeof parsed === "string") {
      const num = Number(parsed);
      return Number.isFinite(num) ? num : null;
    }
  } catch {
    return null;
  }
  return null;
}

export default async function SchoolsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; control?: string; state?: string; saved?: string; chip?: string }>;
}) {
  const params = await searchParams;
  const quickFilter =
    params.chip === "high_oos" || params.chip === "t20_research" || params.chip === "family_friendly"
      ? params.chip
      : undefined;
  const bundle = await getProfileBundle();
  const schools = await getExplorerSchoolsAction({
    q: params.q,
    control: params.control,
    state: params.state,
    onlySaved: params.saved === "1",
    quickFilter,
  });

  const summaries = schools
    .map((school) => {
      const fit = computeFitScore({
        stats: bundle.profile.stats,
        prefs: bundle.profile.prefs,
        weights: bundle.profile.weights,
        wars: bundle.profile.wars,
        school: {
          ...school,
          aiMission: school.aiMissionProfile
            ? {
                themes: school.aiMissionProfile.themes,
                researchIntensity: school.aiMissionProfile.researchIntensity,
                serviceIntensity: school.aiMissionProfile.serviceIntensity,
                ruralOrientation: school.aiMissionProfile.ruralOrientation,
                urbanUnderservedOrientation:
                  school.aiMissionProfile.urbanUnderservedOrientation,
              }
            : null,
        },
        aiProfile: bundle.profile.ai
          ? {
              academicStrength: bundle.profile.ai.academicStrength,
              clinicalDepth: bundle.profile.ai.clinicalDepth,
              researchReadiness: bundle.profile.ai.researchReadiness,
              serviceOrientation: bundle.profile.ai.serviceOrientation,
              leadershipImpact: bundle.profile.ai.leadershipImpact,
              narrativeCoherence: bundle.profile.ai.narrativeCoherence,
              missionThemes: bundle.profile.ai.missionThemes,
            }
          : null,
      });
      return {
        slug: school.slug,
        id: school.id,
        name: school.name,
        city: school.city,
        state: school.state,
        zip: school.zip ?? null,
        control: school.control,
        lat: school.lat,
        lng: school.lng,
        fitScore: fit.breakdown.holisticFitScore,
        breakdown: fit.breakdown,
        tier: fit.statTier,
        annualCost: fit.annualCost,
        tuition:
          school.financialProfile?.tuitionResident ??
          school.financialProfile?.tuitionNonResident ??
          null,
        localRentMonthly:
          school.costOfLivingProfile?.hudTwoBedroomFairMarketRent ??
          school.costOfLivingProfile?.mitFamilyThreeMonthlyLivingWage ??
          parseFactNumber(school.facts.find((f) => f.key === "hud_2br_fmr_monthly")?.valueJson) ??
          bundle.profile.prefs.monthlyAreaRealityBudget ??
          null,
        trueCol:
          (school.financialProfile?.tuitionResident ??
            school.financialProfile?.tuitionNonResident ??
            parseFactNumber(school.facts.find((f) => f.key === "aamc_2025_2026_total_resident")?.valueJson) ??
            parseFactNumber(school.facts.find((f) => f.key === "aamc_2025_2026_total_nonresident")?.valueJson) ??
            null) != null ||
          (school.costOfLivingProfile?.hudTwoBedroomFairMarketRent ??
            school.costOfLivingProfile?.mitFamilyThreeMonthlyLivingWage ??
            parseFactNumber(school.facts.find((f) => f.key === "hud_2br_fmr_monthly")?.valueJson) ??
            bundle.profile.prefs.monthlyAreaRealityBudget ??
            null) != null
            ? (school.financialProfile?.tuitionResident ??
                school.financialProfile?.tuitionNonResident ??
                parseFactNumber(school.facts.find((f) => f.key === "aamc_2025_2026_total_resident")?.valueJson) ??
                parseFactNumber(school.facts.find((f) => f.key === "aamc_2025_2026_total_nonresident")?.valueJson) ??
                0) +
              (school.costOfLivingProfile?.hudTwoBedroomFairMarketRent ??
                school.costOfLivingProfile?.mitFamilyThreeMonthlyLivingWage ??
                parseFactNumber(school.facts.find((f) => f.key === "hud_2br_fmr_monthly")?.valueJson) ??
                bundle.profile.prefs.monthlyAreaRealityBudget ??
                0) *
                12
            : null,
        trueMonthlyCol: fit.breakdown.trueCoa != null ? fit.breakdown.trueCoa / 12 : null,
        medianMcatRaw:
          school.financialProfile?.medianMcat ??
          parseFactNumber(school.facts.find((f) => f.key === "median_mcat")?.valueJson),
        medianMcat:
          school.financialProfile?.medianMcat ??
          parseFactNumber(school.facts.find((f) => f.key === "median_mcat")?.valueJson),
        medianGpa: school.financialProfile?.medianCgpa ?? parseFactNumber(school.facts.find((f) => f.key === "median_cgpa")?.valueJson),
        isT20Research:
          (school.financialProfile?.medianMcat ?? 0) >= 519 ||
          (school.missionTagNotes ?? "").toLowerCase().includes("research"),
        isFamilyFriendly:
          fit.breakdown.familySafetyNet >= 7 ||
          Boolean(school.studentAffairsUrl),
        hasThreeYearTrackRaw:
          school.strategyProfile?.hasThreeYearMdPathway ??
          school.has3YearPathway ??
          null,
        hasThreeYearTrack:
          school.strategyProfile?.hasThreeYearMdPathway ??
          school.has3YearPathway ??
          false,
      };
    })
    .sort((a, b) => b.fitScore - a.fitScore);

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

      <DirectoryTableMapClient rows={summaries} initialChip={quickFilter ?? "all"} />
    </div>
  );
}

