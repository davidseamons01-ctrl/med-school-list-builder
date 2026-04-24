"use server";

import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { computeFitScore } from "@/lib/scoring";
import { getCachedMedianSnapshot } from "@/lib/cache/school-medians";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import type {
  ProfilePrefs,
  ProfileStats,
  ProfileWeights,
  WarsInputs,
} from "@/lib/types";
import { revalidatePath } from "next/cache";

const DEFAULT_STATS: ProfileStats = {
  cgpa: 3.97,
  sgpa: 4.0,
  mcat: 522,
  residencyState: "ID",
  programType: "MD",
  specialtyInterest: "competitive_specialties",
};

const DEFAULT_PREFS: ProfilePrefs = {
  missionTags: ["rural_health", "health_equity", "research_intensive"],
  avoidStates: [],
  preferStates: [],
  familyPriority: 5,
  coaSensitivity: 4,
  prestigeResearchWeight: 4,
  monthlyHousingBudget: 1800,
  monthlyAreaRealityBudget: 3000,
  householdAdults: 2,
  householdChildren: 1,
  wantsArcGisExplorer: true,
};

const DEFAULT_WEIGHTS: ProfileWeights = {
  stats: 0.23,
  mission: 0.2,
  colFamily: 0.27,
  geography: 0.12,
  research: 0.18,
};

const DEFAULT_WARS: WarsInputs = {
  clinicalHours: 1200,
  researchHours: 1800,
  volunteeringHours: 600,
  leadershipFlag: true,
};

function parseFactNumber(raw: string): number | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "number" && Number.isFinite(parsed)) return parsed;
    if (typeof parsed === "string") {
      const n = Number(parsed);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  } catch {
    return null;
  }
}

async function getPrimaryContext() {
  const session = await getServerSession(authOptions);
  const sessionUserId = session?.user?.id;
  const existingProfile = sessionUserId
    ? await prisma.applicantProfile.findFirst({
        where: { userId: sessionUserId },
        orderBy: { createdAt: "asc" },
      })
    : await prisma.applicantProfile.findFirst({
        where: {},
        orderBy: { createdAt: "asc" },
      });
  const profile =
    existingProfile ??
    (await prisma.applicantProfile.create({
      data: {
        userId: sessionUserId,
        displayName: "Applicant",
        statsJson: JSON.stringify(DEFAULT_STATS),
        prefsJson: JSON.stringify(DEFAULT_PREFS),
        weightsJson: JSON.stringify(DEFAULT_WEIGHTS),
        warsJson: JSON.stringify(DEFAULT_WARS),
      },
    }));
  const list =
    (await prisma.schoolList.findFirst({
      where: { profileId: profile.id },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.schoolList.create({
      data: { name: "Primary list", profileId: profile.id },
    }));
  return { profile, list };
}

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function getProfileBundle() {
  const { profile, list } = await getPrimaryContext();
  const aiProfile = await prisma.applicantAiProfile.findUnique({
    where: { profileId: profile.id },
  });
  return {
    profile: {
      id: profile.id,
      displayName: profile.displayName,
      stats: parseJson<ProfileStats>(profile.statsJson, DEFAULT_STATS),
      prefs: parseJson<ProfilePrefs>(profile.prefsJson, DEFAULT_PREFS),
      weights: parseJson<ProfileWeights>(profile.weightsJson, DEFAULT_WEIGHTS),
      wars: parseJson<WarsInputs>(profile.warsJson, DEFAULT_WARS),
      ai: aiProfile
        ? {
            academicStrength: aiProfile.academicStrength,
            clinicalDepth: aiProfile.clinicalDepth,
            researchReadiness: aiProfile.researchReadiness,
            serviceOrientation: aiProfile.serviceOrientation,
            leadershipImpact: aiProfile.leadershipImpact,
            narrativeCoherence: aiProfile.narrativeCoherence,
            missionThemes: parseJson<Array<{ theme: string; weight: number }>>(
              aiProfile.missionThemesJson,
              [],
            ),
            archetypes: parseJson<string[]>(aiProfile.archetypesJson, []),
            strengths: parseJson<string[]>(aiProfile.strengthsJson, []),
            gaps: parseJson<string[]>(aiProfile.gapsJson, []),
            redFlags: parseJson<string[]>(aiProfile.redFlagsJson, []),
            narrativeSummary: aiProfile.narrativeSummary,
            generatedAt: aiProfile.generatedAt.toISOString(),
          }
        : null,
    },
    listId: list.id,
  };
}

export async function updateProfileAction(formData: FormData) {
  const { profile } = await getPrimaryContext();
  const stats: ProfileStats = {
    cgpa: Number(formData.get("cgpa") ?? 3.7),
    sgpa: Number(formData.get("sgpa") ?? 3.8),
    mcat: Number(formData.get("mcat") ?? 510),
    residencyState: String(formData.get("residencyState") ?? ""),
    programType: String(formData.get("programType") ?? "MD"),
    specialtyInterest: String(
      formData.get("specialtyInterest") ?? "competitive_specialties",
    ),
  };
  const prefs: ProfilePrefs = {
    missionTags: String(formData.get("missionTags") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    avoidStates: String(formData.get("avoidStates") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    preferStates: String(formData.get("preferStates") ?? "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    familyPriority: Number(formData.get("familyPriority") ?? 3),
    coaSensitivity: Number(formData.get("coaSensitivity") ?? 3),
    prestigeResearchWeight: Number(formData.get("prestigeResearchWeight") ?? 2),
    monthlyHousingBudget: Number(formData.get("monthlyHousingBudget") ?? 1800),
    monthlyAreaRealityBudget: Number(formData.get("monthlyAreaRealityBudget") ?? 3000),
    householdAdults: Number(formData.get("householdAdults") ?? 2),
    householdChildren: Number(formData.get("householdChildren") ?? 1),
    wantsArcGisExplorer: formData.getAll("wantsArcGisExplorer").includes("on"),
  };
  const weights: ProfileWeights = {
    stats: Number(formData.get("w_stats") ?? 0.25),
    mission: Number(formData.get("w_mission") ?? 0.2),
    colFamily: Number(formData.get("w_colFamily") ?? 0.25),
    geography: Number(formData.get("w_geography") ?? 0.15),
    research: Number(formData.get("w_research") ?? 0.15),
  };
  const wars: WarsInputs = {
    clinicalHours: Number(formData.get("clinicalHours") ?? 400),
    researchHours: Number(formData.get("researchHours") ?? 500),
    volunteeringHours: Number(formData.get("volunteeringHours") ?? 200),
    leadershipFlag: formData.getAll("leadershipFlag").includes("on"),
  };
  await prisma.applicantProfile.update({
    where: { id: profile.id },
    data: {
      displayName: String(formData.get("displayName") ?? "Applicant"),
      statsJson: JSON.stringify(stats),
      prefsJson: JSON.stringify(prefs),
      weightsJson: JSON.stringify(weights),
      warsJson: JSON.stringify(wars),
    },
  });
  revalidatePath("/");
  revalidatePath("/onboarding");
  revalidatePath("/schools");
  revalidatePath("/compare");
}

export async function getExplorerSchoolsAction(input?: {
  q?: string;
  control?: string;
  state?: string;
  onlySaved?: boolean;
  quickFilter?: "high_oos" | "t20_research" | "family_friendly";
  mcatMin?: number;
  mcatMax?: number;
  tuitionMax?: number;
  requireThreeYearPathway?: boolean;
  excludeYieldProtection?: boolean;
  minSafetyGrade?: "A" | "B" | "C" | "D" | "F";
}) {
  const { list } = await getPrimaryContext();
  const q = input?.q?.trim() ?? "";
  const gradeOrder = ["F", "D", "C", "B", "A"] as const;
  const minGradeIndex = input?.minSafetyGrade
    ? gradeOrder.indexOf(input.minSafetyGrade)
    : -1;
  const allowedGrades =
    minGradeIndex >= 0
      ? gradeOrder.slice(minGradeIndex).reverse()
      : [];
  const savedIds = input?.onlySaved
    ? (
        await prisma.schoolListEntry.findMany({
          where: { listId: list.id },
          select: { schoolId: true },
        })
      ).map((row) => row.schoolId)
    : [];
  const schools = await prisma.school.findMany({
    where: {
      AND: [
        q
          ? {
              OR: [
                { name: { contains: q } },
                { city: { contains: q } },
                { state: { contains: q } },
              ],
            }
          : {},
        input?.control ? { control: input.control } : {},
        input?.state ? { state: input.state } : {},
        input?.onlySaved ? { id: { in: savedIds } } : {},
        input?.quickFilter === "high_oos"
          ? {
              OR: [
                { oosFriendly: true },
                { residencyBiasNotes: { contains: "oos", mode: "insensitive" } },
                { residencyBiasNotes: { contains: "out-of-state", mode: "insensitive" } },
              ],
            }
          : {},
        input?.quickFilter === "t20_research"
          ? {
              OR: [
                { financialProfile: { is: { medianMcat: { gte: 519 } } } },
                { missionTagNotes: { contains: "research", mode: "insensitive" } },
              ],
            }
          : {},
        input?.quickFilter === "family_friendly"
          ? {
              OR: [
                { familyFriendly: true },
                { neighborhoodSafeties: { some: { safetyGrade: { in: ["A", "B"] } } } },
                { neighborhoodSafeties: { some: { compositeSafetyScore: { gte: 70 } } } },
              ],
            }
          : {},
        input?.mcatMin != null
          ? { financialProfile: { is: { medianMcat: { gte: input.mcatMin } } } }
          : {},
        input?.mcatMax != null
          ? { financialProfile: { is: { medianMcat: { lte: input.mcatMax } } } }
          : {},
        input?.tuitionMax != null
          ? {
              financialProfile: {
                is: {
                  OR: [
                    { tuitionResident: { lte: input.tuitionMax } },
                    { tuitionNonResident: { lte: input.tuitionMax } },
                  ],
                },
              },
            }
          : {},
        input?.requireThreeYearPathway
          ? { strategyProfile: { is: { hasThreeYearMdPathway: true } } }
          : {},
        input?.excludeYieldProtection
          ? {
              OR: [
                { strategyProfile: { is: null } },
                { strategyProfile: { is: { hasYieldProtectionFlag: false } } },
                { strategyProfile: { is: { hasYieldProtectionFlag: null } } },
              ],
            }
          : {},
        allowedGrades.length > 0
          ? {
              neighborhoodSafeties: {
                some: {
                  safetyGrade: {
                    in: allowedGrades,
                  },
                },
              },
            }
          : {},
      ],
    },
    include: {
      facts: {
        where: {
          key: {
            in: [
              "median_mcat",
              "median_cgpa",
              "tuition_resident",
              "tuition_nonresident",
              "aamc_2025_2026_total_resident",
              "aamc_2025_2026_total_nonresident",
              "avg_institutional_aid_amount",
              "pct_receiving_aid",
              "oos_acceptance_rate",
              "public_oos_acceptance_rate",
              "hud_2br_fmr_monthly",
            ],
          },
        },
      },
      financialProfile: true,
      costOfLivingProfile: true,
      strategyProfile: true,
      neighborhoodSafeties: {
        take: 5,
        orderBy: { updatedAt: "desc" },
      },
      clinicalAffiliations: {
        take: 6,
        orderBy: { updatedAt: "desc" },
      },
      aiMissionProfile: true,
    },
    orderBy: [{ state: "asc" }, { name: "asc" }],
    take: 220,
  });
  const hydrated = await Promise.all(
    schools.map(async (school) => {
      const medianSnapshot = await getCachedMedianSnapshot(school.id, () => {
        const medianMcatFact = school.facts.find((fact) => fact.key === "median_mcat");
        const medianCgpaFact = school.facts.find((fact) => fact.key === "median_cgpa");
        const tuitionResidentFact = school.facts.find((fact) => fact.key === "tuition_resident");
        const tuitionNonResidentFact = school.facts.find((fact) => fact.key === "tuition_nonresident");
        return {
          medianMcat: school.financialProfile?.medianMcat ?? parseFactNumber(medianMcatFact?.valueJson ?? ""),
          medianCgpa: school.financialProfile?.medianCgpa ?? parseFactNumber(medianCgpaFact?.valueJson ?? ""),
          tuitionResident:
            school.financialProfile?.tuitionResident ?? parseFactNumber(tuitionResidentFact?.valueJson ?? ""),
          tuitionNonResident:
            school.financialProfile?.tuitionNonResident ?? parseFactNumber(tuitionNonResidentFact?.valueJson ?? ""),
        };
      });

      return {
        ...school,
        financialProfile: school.financialProfile
          ? {
              ...school.financialProfile,
              medianMcat: school.financialProfile.medianMcat ?? medianSnapshot.medianMcat,
              medianCgpa: school.financialProfile.medianCgpa ?? medianSnapshot.medianCgpa,
              tuitionResident: school.financialProfile.tuitionResident ?? medianSnapshot.tuitionResident,
              tuitionNonResident: school.financialProfile.tuitionNonResident ?? medianSnapshot.tuitionNonResident,
            }
          : null,
        aiMissionProfile: school.aiMissionProfile
          ? {
              themes: parseJson<Array<{ theme: string; weight: number }>>(
                school.aiMissionProfile.themesJson,
                [],
              ),
              archetypes: parseJson<string[]>(school.aiMissionProfile.archetypesJson, []),
              focusSummary: school.aiMissionProfile.focusSummary,
              selectivityTier: school.aiMissionProfile.selectivityTier,
              researchIntensity: school.aiMissionProfile.researchIntensity,
              serviceIntensity: school.aiMissionProfile.serviceIntensity,
              ruralOrientation: school.aiMissionProfile.ruralOrientation,
              urbanUnderservedOrientation:
                school.aiMissionProfile.urbanUnderservedOrientation,
              generatedAt: school.aiMissionProfile.generatedAt.toISOString(),
            }
          : null,
      };
    }),
  );
  return hydrated;
}

export async function searchSchoolsAction(query: string, control?: string) {
  return getExplorerSchoolsAction({ q: query, control });
}

export async function getSchoolDetailAction(slug: string) {
  const { list } = await getPrimaryContext();
  const school = await prisma.school.findUnique({
    where: { slug },
    include: {
      facts: { orderBy: [{ category: "asc" }, { label: "asc" }] },
      resources: { orderBy: [{ category: "asc" }, { sortOrder: "asc" }] },
      listEntries: { where: { listId: list.id } },
      financialProfile: true,
      costOfLivingProfile: true,
      strategyProfile: true,
      neighborhoodSafeties: { orderBy: [{ updatedAt: "desc" }] },
      neighborhoodSafety: { orderBy: [{ updatedAt: "desc" }] },
      clinicalAffiliations: { orderBy: [{ updatedAt: "desc" }, { hospitalName: "asc" }] },
      secondaryPrompts: { orderBy: [{ year: "desc" }, { createdAt: "desc" }] },
      aiMissionProfile: true,
    },
  });
  if (!school) return null;
  return {
    ...school,
    aiMissionProfile: school.aiMissionProfile
      ? {
          themes: parseJson<Array<{ theme: string; weight: number }>>(
            school.aiMissionProfile.themesJson,
            [],
          ),
          archetypes: parseJson<string[]>(school.aiMissionProfile.archetypesJson, []),
          focusSummary: school.aiMissionProfile.focusSummary,
          selectivityTier: school.aiMissionProfile.selectivityTier,
          researchIntensity: school.aiMissionProfile.researchIntensity,
          serviceIntensity: school.aiMissionProfile.serviceIntensity,
          ruralOrientation: school.aiMissionProfile.ruralOrientation,
          urbanUnderservedOrientation: school.aiMissionProfile.urbanUnderservedOrientation,
          generatedAt: school.aiMissionProfile.generatedAt.toISOString(),
        }
      : null,
  };
}

export async function addSchoolToListAction(slug: string) {
  const { list } = await getPrimaryContext();
  const school = await prisma.school.findUnique({ where: { slug } });
  if (!school) return { ok: false as const, error: "School not found" };
  const { profile } = await getPrimaryContext();
  const stats = parseJson<ProfileStats>(profile.statsJson, DEFAULT_STATS);
  const prefs = parseJson<ProfilePrefs>(profile.prefsJson, DEFAULT_PREFS);
  const weights = parseJson<ProfileWeights>(profile.weightsJson, DEFAULT_WEIGHTS);
  const wars = parseJson<WarsInputs>(profile.warsJson, DEFAULT_WARS);
  const facts = await prisma.schoolFact.findMany({ where: { schoolId: school.id } });
  const { composite, breakdown, statTier } = computeFitScore({
    stats,
    prefs,
    weights,
    wars,
    school: {
      state: school.state,
      control: school.control,
      missionTagNotes: school.missionTagNotes,
      facts,
    },
  });
  const existing = await prisma.schoolListEntry.findUnique({
    where: { listId_schoolId: { listId: list.id, schoolId: school.id } },
  });
  await prisma.schoolListEntry.upsert({
    where: { listId_schoolId: { listId: list.id, schoolId: school.id } },
    create: {
      listId: list.id,
      schoolId: school.id,
      tier: statTier,
      applyStatus: "CONSIDERING",
      compositeScore: composite,
      scoreBreakdownJson: JSON.stringify(breakdown),
    },
    update: {
      compositeScore: composite,
      scoreBreakdownJson: JSON.stringify(breakdown),
      tier: existing?.tierOverride ? existing.tier : statTier,
    },
  });
  revalidatePath("/schools");
  revalidatePath("/compare");
  revalidatePath("/");
  return { ok: true as const };
}

export async function updateListEntryFormAction(formData: FormData) {
  const tierOverrideVals = formData.getAll("tierOverride");
  const tierOverride = tierOverrideVals.includes("on");
  const checklistRaw = String(formData.get("checklistJson") ?? "").trim();
  await updateListEntryAction({
    schoolId: String(formData.get("schoolId") ?? ""),
    tier: String(formData.get("tier") ?? "") || undefined,
    tierOverride,
    applyStatus: String(formData.get("applyStatus") ?? "") || undefined,
    notes: String(formData.get("notes") ?? "") || undefined,
    checklistJson: checklistRaw.length > 0 ? checklistRaw : null,
  });
}

export async function updateListEntryAction(input: {
  schoolId: string;
  tier?: string;
  tierOverride?: boolean;
  applyStatus?: string;
  notes?: string;
  checklistJson?: string | null;
}) {
  const { list } = await getPrimaryContext();
  const data: Prisma.SchoolListEntryUpdateInput = {};
  if (input.tier !== undefined) data.tier = input.tier;
  if (input.tierOverride !== undefined) data.tierOverride = input.tierOverride;
  if (input.applyStatus !== undefined) data.applyStatus = input.applyStatus;
  if (input.notes !== undefined) data.notes = input.notes;
  if (input.checklistJson !== undefined) data.checklistJson = input.checklistJson ?? null;
  await prisma.schoolListEntry.update({
    where: { listId_schoolId: { listId: list.id, schoolId: input.schoolId } },
    data,
  });
  revalidatePath("/");
  revalidatePath("/compare");
  revalidatePath("/schools");
}

export async function updateTrackerApplyStatusAction(input: {
  schoolId: string;
  applyStatus: "CONSIDERING" | "APPLY" | "SECONDARY" | "INTERVIEW";
}) {
  await updateListEntryAction({
    schoolId: input.schoolId,
    applyStatus: input.applyStatus,
  });
  revalidatePath("/tracker");
}

export async function upsertSchoolFactFormAction(formData: FormData) {
  const raw = formData.get("value");
  const num = raw != null && raw !== "" ? Number(raw) : NaN;
  const valueJson = JSON.stringify(Number.isFinite(num) ? num : String(raw ?? ""));
  await upsertSchoolFactAction({
    schoolId: String(formData.get("schoolId") ?? ""),
    schoolSlug: String(formData.get("schoolSlug") ?? ""),
    key: String(formData.get("key") ?? ""),
    category: String(formData.get("category") ?? "hard_numbers"),
    label: String(formData.get("label") ?? String(formData.get("key") ?? "")),
    valueJson,
    valueType: String(formData.get("valueType") ?? "number"),
    unit: String(formData.get("unit") ?? "") || undefined,
    sourceType: String(formData.get("sourceType") ?? "USER_MANUAL"),
    sourceLabel: String(formData.get("sourceLabel") ?? "") || undefined,
    sourceUrl: String(formData.get("sourceUrl") ?? "") || undefined,
  });
}

export async function upsertSchoolFactAction(input: {
  schoolId: string;
  schoolSlug: string;
  key: string;
  category: string;
  label: string;
  valueJson: string;
  valueType: string;
  unit?: string;
  sourceType: string;
  sourceLabel?: string;
  sourceUrl?: string;
}) {
  await prisma.schoolFact.upsert({
    where: {
      schoolId_key: { schoolId: input.schoolId, key: input.key },
    },
    create: {
      schoolId: input.schoolId,
      key: input.key,
      category: input.category,
      label: input.label,
      valueJson: input.valueJson,
      valueType: input.valueType,
      unit: input.unit,
      sourceType: input.sourceType,
      sourceLabel: input.sourceLabel,
      sourceUrl: input.sourceUrl,
      retrievedAt: new Date(),
      isVerified: input.sourceType !== "USER_MANUAL",
    },
    update: {
      category: input.category,
      label: input.label,
      valueJson: input.valueJson,
      valueType: input.valueType,
      unit: input.unit,
      sourceType: input.sourceType,
      sourceLabel: input.sourceLabel,
      sourceUrl: input.sourceUrl,
      retrievedAt: new Date(),
    },
  });
  revalidatePath("/schools");
  revalidatePath(`/schools/${input.schoolSlug}`);
}

export async function importMsarFormAction(formData: FormData) {
  const schoolId = String(formData.get("schoolId") ?? "");
  const schoolSlug = String(formData.get("schoolSlug") ?? "");
  const payload = String(formData.get("payload") ?? "{}");
  await importSchoolMsarJsonAction({ schoolId, schoolSlug, payload });
}

export async function importSchoolMsarJsonAction(input: {
  schoolId: string;
  schoolSlug: string;
  payload: string;
}) {
  const obj = JSON.parse(input.payload) as Record<string, number | string>;
  const numericKeys = [
    "median_mcat",
    "median_cgpa",
    "pct_receiving_aid",
    "median_grad_debt",
    "median_sgpa",
  ];
  for (const key of numericKeys) {
    if (obj[key] === undefined || obj[key] === "") continue;
    const num = Number(obj[key]);
    if (!Number.isFinite(num)) continue;
    await prisma.schoolFact.upsert({
      where: { schoolId_key: { schoolId: input.schoolId, key } },
      create: {
        schoolId: input.schoolId,
        key,
        category: "hard_numbers",
        label: key.replaceAll("_", " "),
        valueJson: JSON.stringify(num),
        valueType: "number",
        sourceType: "USER_MSAR",
        sourceLabel: "Imported from user-provided MSAR data",
        sourceUrl: "https://students-residents.aamc.org/applying-medical-school/applying-medical-school-process/medical-school-admission-requirements/",
        retrievedAt: new Date(),
        isVerified: false,
      },
      update: {
        category: "hard_numbers",
        label: key.replaceAll("_", " "),
        valueJson: JSON.stringify(num),
        valueType: "number",
        sourceType: "USER_MSAR",
        sourceLabel: "Imported from user-provided MSAR data",
        retrievedAt: new Date(),
      },
    });
  }
  revalidatePath("/schools");
  revalidatePath(`/schools/${input.schoolSlug}`);
}

export async function updateSchoolMetaFormAction(formData: FormData) {
  await updateSchoolMetaAction({
    schoolId: String(formData.get("schoolId") ?? ""),
    schoolSlug: String(formData.get("schoolSlug") ?? ""),
    campusAddress: String(formData.get("campusAddress") ?? "") || undefined,
    zip: String(formData.get("zip") ?? "") || undefined,
    countyName: String(formData.get("countyName") ?? "") || undefined,
    lat:
      formData.get("lat") != null && String(formData.get("lat")).trim() !== ""
        ? Number(formData.get("lat"))
        : undefined,
    lng:
      formData.get("lng") != null && String(formData.get("lng")).trim() !== ""
        ? Number(formData.get("lng"))
        : undefined,
    countyFips: String(formData.get("countyFips") ?? "") || undefined,
    websiteUrl: String(formData.get("websiteUrl") ?? "") || undefined,
    admissionsUrl: String(formData.get("admissionsUrl") ?? "") || undefined,
    studentAffairsUrl: String(formData.get("studentAffairsUrl") ?? "") || undefined,
    financialAidUrl: String(formData.get("financialAidUrl") ?? "") || undefined,
    secondaryPromptsUrl: String(formData.get("secondaryPromptsUrl") ?? "") || undefined,
    missionTagNotes: String(formData.get("missionTagNotes") ?? "") || undefined,
    residencyBiasNotes: String(formData.get("residencyBiasNotes") ?? "") || undefined,
  });
}

export async function updateSchoolMetaAction(input: {
  schoolId: string;
  schoolSlug?: string;
  campusAddress?: string;
  zip?: string;
  countyName?: string;
  lat?: number;
  lng?: number;
  countyFips?: string;
  websiteUrl?: string;
  admissionsUrl?: string;
  studentAffairsUrl?: string;
  financialAidUrl?: string;
  secondaryPromptsUrl?: string;
  missionTagNotes?: string;
  residencyBiasNotes?: string;
}) {
  await prisma.school.update({
    where: { id: input.schoolId },
    data: {
      campusAddress: input.campusAddress,
      zip: input.zip,
      countyName: input.countyName,
      lat: input.lat,
      lng: input.lng,
      countyFips: input.countyFips,
      websiteUrl: input.websiteUrl,
      admissionsUrl: input.admissionsUrl,
      studentAffairsUrl: input.studentAffairsUrl,
      financialAidUrl: input.financialAidUrl,
      secondaryPromptsUrl: input.secondaryPromptsUrl,
      missionTagNotes: input.missionTagNotes,
      residencyBiasNotes: input.residencyBiasNotes,
      lastVerifiedAt: new Date(),
    },
  });
  revalidatePath("/schools");
  if (input.schoolSlug) revalidatePath(`/schools/${input.schoolSlug}`);
}

export async function addSchoolResourceFormAction(formData: FormData) {
  const schoolId = String(formData.get("schoolId") ?? "");
  const schoolSlug = String(formData.get("schoolSlug") ?? "");
  await prisma.schoolResource.create({
    data: {
      schoolId,
      category: String(formData.get("category") ?? "manual"),
      kind: String(formData.get("kind") ?? "manual_link"),
      provider: String(formData.get("provider") ?? "Manual"),
      label: String(formData.get("label") ?? "Manual resource"),
      url: String(formData.get("url") ?? ""),
      description: String(formData.get("description") ?? "") || undefined,
      isSeeded: false,
      sortOrder: 999,
    },
  });
  revalidatePath("/schools");
  revalidatePath(`/schools/${schoolSlug}`);
}

export async function getListEntriesAction() {
  const { list, profile } = await getPrimaryContext();
  const entries = await prisma.schoolListEntry.findMany({
    where: { listId: list.id },
    include: { school: { include: { facts: true } } },
    orderBy: { compositeScore: "desc" },
  });
  return { entries, profileId: profile.id, listId: list.id };
}

export async function recomputeListScoresAction() {
  const { list, profile } = await getPrimaryContext();
  const stats = parseJson<ProfileStats>(profile.statsJson, DEFAULT_STATS);
  const prefs = parseJson<ProfilePrefs>(profile.prefsJson, DEFAULT_PREFS);
  const weights = parseJson<ProfileWeights>(profile.weightsJson, DEFAULT_WEIGHTS);
  const wars = parseJson<WarsInputs>(profile.warsJson, DEFAULT_WARS);
  const entries = await prisma.schoolListEntry.findMany({
    where: { listId: list.id },
    include: { school: { include: { facts: true } } },
  });
  for (const e of entries) {
    const { composite, breakdown, statTier } = computeFitScore({
      stats,
      prefs,
      weights,
      wars,
      school: {
        state: e.school.state,
        control: e.school.control,
        missionTagNotes: e.school.missionTagNotes,
        facts: e.school.facts,
      },
    });
    await prisma.schoolListEntry.update({
      where: { id: e.id },
      data: {
        compositeScore: composite,
        scoreBreakdownJson: JSON.stringify(breakdown),
        tier: e.tierOverride ? e.tier : statTier,
      },
    });
  }
  revalidatePath("/compare");
  revalidatePath("/schools");
}

export async function getDashboardDataAction() {
  const bundle = await getProfileBundle();
  const listData = await getListEntriesAction();
  const schoolsCount = await prisma.school.count();
  const factsCount = await prisma.schoolFact.count();
  const resourcesCount = await prisma.schoolResource.count();
  return { bundle, listData, schoolsCount, factsCount, resourcesCount };
}

export async function exportBundleAction() {
  const bundle = await getProfileBundle();
  const entries = await getListEntriesAction();
  return JSON.stringify(
    {
      profile: bundle.profile,
      listId: bundle.listId,
      schools: entries.entries.map((e) => ({
        id: e.id,
        slug: e.school.slug,
        name: e.school.name,
        city: e.school.city,
        state: e.school.state,
        tier: e.tier,
        tierOverride: e.tierOverride,
        applyStatus: e.applyStatus,
        compositeScore: e.compositeScore,
        scoreBreakdown: e.scoreBreakdownJson,
        holisticFitScore: (() => {
          try {
            const parsed = JSON.parse(e.scoreBreakdownJson ?? "{}") as { holisticFitScore?: number };
            return parsed.holisticFitScore ?? null;
          } catch {
            return null;
          }
        })(),
        aiVerdict: (() => {
          try {
            const parsed = JSON.parse(e.scoreBreakdownJson ?? "{}") as { aiVerdict?: string };
            return parsed.aiVerdict ?? null;
          } catch {
            return null;
          }
        })(),
        notes: e.notes,
        checklistJson: e.checklistJson,
      })),
      exportedAt: new Date().toISOString(),
      disclaimer:
        "Not admissions advice. Verify all figures against primary sources (MSAR, school sites, AAMC).",
    },
    null,
    2,
  );
}
