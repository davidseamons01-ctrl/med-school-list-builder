import Link from "next/link";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { addSchoolToListAction, getProfileBundle, getSchoolDetailAction } from "@/app/actions";
import { formatCurrency } from "@/lib/format";
import { computeFitScore, getFactNumber } from "@/lib/scoring";
import { ProfileRadarChart } from "@/components/schools/ProfileRadarChart";
import { RealCostCalculator } from "@/components/schools/RealCostCalculator";
import { FamilyResourcesPanel } from "@/components/schools/FamilyResourcesPanel";
import { SecondaryPromptsAccordion } from "@/components/schools/SecondaryPromptsAccordion";
import { AiVerdictCardStream } from "@/components/schools/AiVerdictCardStream";
import { ResearchHubPanel } from "@/components/schools/ResearchHubPanel";
import { buildResearchSections } from "@/lib/research-hub";

type PromptItem = { year: number; prompt: string };

function parseSecondaryPrompts(
  promptsFromDb: Array<{ year: number; promptText: string }>,
  facts: Array<{ key: string; valueJson: string }>,
  fallbackUrl?: string | null,
): PromptItem[] {
  if (promptsFromDb.length > 0) {
    return promptsFromDb
      .slice(0, 3)
      .map((row) => ({ year: row.year, prompt: row.promptText }));
  }
  const thisYear = new Date().getFullYear();
  const out: PromptItem[] = [];
  for (let y = thisYear - 1; y >= thisYear - 3; y -= 1) {
    const key = `secondary_prompt_${y}`;
    const row = facts.find((f) => f.key === key);
    if (row) {
      try {
        const parsed = JSON.parse(row.valueJson);
        out.push({ year: y, prompt: String(parsed) });
        continue;
      } catch {
        out.push({ year: y, prompt: row.valueJson });
        continue;
      }
    }
    out.push({
      year: y,
      prompt: fallbackUrl
        ? `Prompt archive not yet parsed. Review source: ${fallbackUrl}`
        : "Prompt archive not yet parsed for this year.",
    });
  }
  return out;
}

export default async function SchoolDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const school = await getSchoolDetailAction(slug);
  if (!school) notFound();

  const { profile } = await getProfileBundle();
  const fit = computeFitScore({
    stats: profile.stats,
    prefs: profile.prefs,
    weights: profile.weights,
    wars: profile.wars,
    school,
  });

  const alignmentScore = fit.breakdown.holisticFitScore;
  const yieldWarning = fit.breakdown.flags.includes("yield_protection_risk");
  const campusImage = `https://source.unsplash.com/1600x900/?medical-school,campus,${encodeURIComponent(
    `${school.name} ${school.city}`,
  )}`;

  const medianMcat =
    school.financialProfile?.medianMcat ?? getFactNumber(school.facts, "median_mcat") ?? 514;
  const medianGpa =
    school.financialProfile?.medianCgpa ?? getFactNumber(school.facts, "median_cgpa") ?? 3.78;
  const schoolMedianHours =
    getFactNumber(school.facts, "median_total_hours") ??
    getFactNumber(school.facts, "median_clinical_hours") ??
    1700;

  const tuitionAnnual =
    school.financialProfile?.tuitionResident ??
    school.financialProfile?.tuitionNonResident ??
    getFactNumber(school.facts, "aamc_2025_2026_total_resident") ??
    getFactNumber(school.facts, "aamc_2025_2026_total_nonresident");
  const avgAidAnnual =
    getFactNumber(school.facts, "avg_institutional_aid_amount") ??
    (school.financialProfile?.pctReceivingInstitutionalGrants != null && tuitionAnnual != null
      ? (tuitionAnnual * school.financialProfile.pctReceivingInstitutionalGrants) / 100
      : null);
  const latestNeighborhood = school.neighborhoodSafety[0];
  const rent2Bed =
    latestNeighborhood?.rent2Bed ??
    school.costOfLivingProfile?.hudTwoBedroomFairMarketRent ??
    getFactNumber(school.facts, "hud_2br_fmr_monthly");
  const spousePartnerNetwork = Boolean(school.studentAffairsUrl);
  const violentCrimeGrade =
    latestNeighborhood?.violentCrimeGrade ??
    school.neighborhoodSafeties[0]?.safetyGrade ??
    null;
  const propertyCrimeGrade =
    latestNeighborhood?.propertyCrimeGrade ??
    school.neighborhoodSafeties[0]?.safetyGrade ??
    null;
  const avgDaycareCost = school.avgDaycareCost ?? getFactNumber(school.facts, "daycare_monthly_cost");
  const googleKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const hospitalStreetView = school.lat && school.lng
    ? googleKey
      ? `https://www.google.com/maps/embed/v1/streetview?key=${googleKey}&location=${school.lat},${school.lng}&heading=210&pitch=5&fov=70`
      : `https://maps.google.com/maps?q=&layer=c&cbll=${school.lat},${school.lng}&cbp=11,0,0,0,0&output=svembed`
    : `https://www.google.com/maps?q=${encodeURIComponent(`${school.name} campus ${school.city}`)}&output=embed`;

  const prompts = parseSecondaryPrompts(school.secondaryPrompts, school.facts, school.secondaryPromptsUrl);
  const personalStatementProxy = `MCAT ${profile.stats.mcat}; cGPA ${profile.stats.cgpa}; sGPA ${profile.stats.sgpa}; residency ${profile.stats.residencyState}; interest ${profile.stats.specialtyInterest}.`;
  const activitiesProxy = [
    {
      title: "Clinical Experience",
      description: `Clinical hours: ${profile.wars.clinicalHours}`,
      isMostMeaningful: true,
      hours: profile.wars.clinicalHours,
    },
    {
      title: "Research Experience",
      description: `Research hours: ${profile.wars.researchHours}`,
      isMostMeaningful: true,
      hours: profile.wars.researchHours,
    },
    {
      title: "Service Experience",
      description: `Volunteering hours: ${profile.wars.volunteeringHours}. Mission tags: ${profile.prefs.missionTags.join(", ") || "none"}.`,
      isMostMeaningful: false,
      hours: profile.wars.volunteeringHours,
    },
  ];

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-[2rem] border border-white/10">
        <div
          className="h-[300px] bg-cover bg-center"
          style={{ backgroundImage: `linear-gradient(180deg, rgba(2,6,23,0.25), rgba(2,6,23,0.85)), url(${campusImage})` }}
        />
        <div className="absolute inset-x-0 bottom-0 p-6">
          <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">School Deep Dive</p>
          <h1 className="mt-2 text-3xl font-semibold text-white">{school.name}</h1>
          <p className="mt-1 text-sm text-slate-300">
            {school.city}, {school.state}
          </p>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <div className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200">
              Alignment Score {alignmentScore}/100
            </div>
            {yieldWarning && (
              <div className="rounded-full border border-amber-400/30 bg-amber-400/10 px-4 py-2 text-sm font-semibold text-amber-200">
                Yield Protection Warning
              </div>
            )}
            <form
              action={async () => {
                "use server";
                await addSchoolToListAction(school.slug);
              }}
            >
              <button
                type="submit"
                className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm text-white"
              >
                Add / refresh in my cycle
              </button>
            </form>
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Suspense
          fallback={
            <section className="surface rounded-[1.6rem] p-5">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
                AI Verdict
              </h3>
              <p className="mt-3 text-sm text-slate-400">Streaming AI analysis...</p>
            </section>
          }
        >
          <AiVerdictCardStream
            missionTagNotes={school.missionTagNotes}
            personalStatement={personalStatementProxy}
            activities={activitiesProxy}
            facts={school.facts.map((fact) => ({
              key: fact.key,
              valueJson: fact.valueJson,
              label: fact.label,
            }))}
          />
        </Suspense>

        <ProfileRadarChart school={{ mcat: medianMcat, gpa: medianGpa, hours: schoolMedianHours }} />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <RealCostCalculator
          tuitionAnnual={tuitionAnnual}
          avgAidAnnual={avgAidAnnual}
          rent2BedMonthly={rent2Bed}
        />
        <FamilyResourcesPanel
          spousePartnerNetwork={spousePartnerNetwork}
          violentCrimeGrade={violentCrimeGrade}
          propertyCrimeGrade={propertyCrimeGrade}
          avgDaycareCost={avgDaycareCost}
          streetViewEmbedUrl={hospitalStreetView}
        />
      </div>

      <ResearchHubPanel
        sections={buildResearchSections({
          name: school.name,
          city: school.city,
          state: school.state,
          zip: school.zip,
          lat: school.lat,
          lng: school.lng,
          websiteUrl: school.websiteUrl,
          admissionsUrl: school.admissionsUrl,
          studentAffairsUrl: school.studentAffairsUrl,
          financialAidUrl: school.financialAidUrl,
          secondaryPromptsUrl: school.secondaryPromptsUrl,
        })}
      />

      <SecondaryPromptsAccordion prompts={prompts} />

      <section className="surface rounded-[1.6rem] p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
          Snapshot Metrics
        </h3>
        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Resident Tuition</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {formatCurrency(
                school.financialProfile?.tuitionResident ??
                  getFactNumber(school.facts, "aamc_2025_2026_total_resident"),
              )}
            </p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Local 2BR Rent</p>
            <p className="mt-2 text-xl font-semibold text-white">{formatCurrency(rent2Bed)}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-slate-950/50 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Median MCAT/GPA</p>
            <p className="mt-2 text-xl font-semibold text-white">
              {medianMcat} / {medianGpa.toFixed(2)}
            </p>
          </div>
        </div>
      </section>

      <p className="text-sm text-slate-400">
        <Link href="/schools" className="text-cyan-300 hover:text-cyan-200">
          Back to explorer
        </Link>
      </p>
    </div>
  );
}

