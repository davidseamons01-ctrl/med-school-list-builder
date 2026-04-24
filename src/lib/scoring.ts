import type {
  ExplorerSchool,
  ProfilePrefs,
  ProfileStats,
  ProfileWeights,
  SchoolFactRow,
  ScoreBreakdown,
  WarsInputs,
} from "./types";
import { TIER_BASELINE, TIER_REACH, TIER_TARGET } from "./types";
import {
  MISSION_THEMES,
  extractSchoolMissionThemes,
  missionFitFromThemes,
  sharpenAlignment,
  themeVectorCosine,
  type MissionTheme,
  type ThemeWeights,
} from "./ai/mission-themes";

export type ApplicantAiProfileForScoring = {
  academicStrength: number;
  clinicalDepth: number;
  researchReadiness: number;
  serviceOrientation: number;
  leadershipImpact: number;
  narrativeCoherence: number;
  missionThemes: Array<{ theme: string; weight: number }>;
};

export type SchoolAiMissionForScoring = {
  themes: Array<{ theme: string; weight: number }>;
  researchIntensity: number;
  serviceIntensity: number;
  ruralOrientation: number;
  urbanUnderservedOrientation: number;
};

function coerceMissionTheme(raw: string): MissionTheme | null {
  const canonical = MISSION_THEMES as readonly string[];
  return canonical.includes(raw) ? (raw as MissionTheme) : null;
}

function themesArrayToWeights(
  themes: Array<{ theme: string; weight: number }>,
): ThemeWeights {
  const result: ThemeWeights = {};
  for (const { theme, weight } of themes) {
    const canonical = coerceMissionTheme(theme);
    if (canonical) {
      result[canonical] = Math.max(result[canonical] ?? 0, weight);
    }
  }
  return result;
}

type ScoreSchoolInput = Pick<
  ExplorerSchool,
  "state" | "control" | "missionTagNotes" | "facts"
> & {
  studentAffairsUrl?: string | null;
  oosFriendly?: boolean | null;
  oosMatriculantPct?: number | null;
  familyFriendly?: boolean | null;
  financialProfile?: ExplorerSchool["financialProfile"];
  costOfLivingProfile?: ExplorerSchool["costOfLivingProfile"];
  strategyProfile?: ExplorerSchool["strategyProfile"];
  neighborhoodSafeties?: ExplorerSchool["neighborhoodSafeties"];
  clinicalAffiliations?: ExplorerSchool["clinicalAffiliations"];
  aiMission?: SchoolAiMissionForScoring | null;
};

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function normalizeWeights(weights: ProfileWeights): ProfileWeights {
  const total =
    weights.stats +
      weights.mission +
      weights.colFamily +
      weights.geography +
      weights.research || 1;
  return {
    stats: weights.stats / total,
    mission: weights.mission / total,
    colFamily: weights.colFamily / total,
    geography: weights.geography / total,
    research: weights.research / total,
  };
}

export function parseFactValue<T = unknown>(fact?: Pick<SchoolFactRow, "valueJson"> | null): T | null {
  if (!fact) return null;
  try {
    return JSON.parse(fact.valueJson) as T;
  } catch {
    return null;
  }
}

export function getFactNumber(facts: SchoolFactRow[], key: string): number | null {
  const raw = parseFactValue(facts.find((fact) => fact.key === key));
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  if (typeof raw === "string") {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

export function getResidencyAwareAnnualCost(
  facts: SchoolFactRow[],
  residencyState: string,
  schoolState: string,
): number | null {
  const suffix = residencyState.trim().toUpperCase() === schoolState.trim().toUpperCase() ? "resident" : "nonresident";
  return (
    getFactNumber(facts, `aamc_2025_2026_total_${suffix}`) ??
    getFactNumber(facts, "aamc_2025_2026_total_nonresident") ??
    getFactNumber(facts, "aamc_2025_2026_total_resident")
  );
}

export function calculateTrueCostOfAttendance(input: {
  tuition: number | null;
  avgAid: number | null;
  localRentMonthly: number | null;
}): number | null {
  if (input.tuition == null || input.localRentMonthly == null) return null;
  const aid = input.avgAid ?? 0;
  return Math.max(0, input.tuition - aid + input.localRentMonthly * 12);
}

function safetyGradeToScore(grade: string | null | undefined): number {
  const normalized = (grade ?? "").toUpperCase().trim();
  if (normalized === "A") return 10;
  if (normalized === "B") return 8;
  if (normalized === "C") return 6;
  if (normalized === "D") return 4;
  if (normalized === "F") return 2;
  return 5;
}

export function calculateFamilySafetyNetScore(input: {
  neighborhoodSafetyGrade?: string | null;
  areaSafetyComposite?: number | null;
  rentMonthly?: number | null;
  spouseAssociations?: boolean;
}): number {
  const gradeScore = safetyGradeToScore(input.neighborhoodSafetyGrade);
  const compositeSafety = input.areaSafetyComposite != null
    ? Math.max(1, Math.min(10, input.areaSafetyComposite))
    : gradeScore;
  const rentPenalty = input.rentMonthly == null ? 0 : Math.min(2.5, Math.max(0, (input.rentMonthly - 1800) / 600));
  const spouseBonus = input.spouseAssociations ? 1 : 0;
  const score = Math.max(1, Math.min(10, (gradeScore + compositeSafety) / 2 - rentPenalty + spouseBonus));
  return Number(score.toFixed(1));
}

export function calculateAcademicPowerhouseIndex(input: {
  medianMcat: number | null;
  medianCgpa: number | null;
  researchFocusedApplicant: boolean;
  traumaLevelCount: number;
  safetyNetCount: number;
  vaCount: number;
  hasThreeYearPathway?: boolean | null;
}): number {
  const mcatSignal = input.medianMcat == null ? 0.5 : clamp01((input.medianMcat - 500) / 25);
  const gpaSignal = input.medianCgpa == null ? 0.5 : clamp01((input.medianCgpa - 3.4) / 0.5);
  const affiliationSignal = clamp01(
    input.traumaLevelCount * 0.12 + input.safetyNetCount * 0.08 + input.vaCount * 0.08,
  );
  const pathwayPenalty = input.hasThreeYearPathway ? 0.04 : 0;
  const applicantBoost = input.researchFocusedApplicant ? 0.08 : 0;
  return clamp01((mcatSignal * 0.4 + gpaSignal * 0.25 + affiliationSignal * 0.35) + applicantBoost - pathwayPenalty);
}

export function lizzym(stats: ProfileStats): number {
  return stats.mcat + stats.cgpa * 10;
}

export function warsTierBand(wars: WarsInputs): "upper" | "mid" | "developing" {
  const score =
    wars.clinicalHours / 400 +
    wars.researchHours / 1000 +
    wars.volunteeringHours / 350 +
    (wars.leadershipFlag ? 0.5 : 0);
  if (score >= 4.2) return "upper";
  if (score >= 2.5) return "mid";
  return "developing";
}

export function suggestStatTier(
  stats: ProfileStats,
  medianMcat: number | null,
  medianCgpa: number | null,
): typeof TIER_BASELINE | typeof TIER_TARGET | typeof TIER_REACH {
  if (medianMcat == null || medianCgpa == null) return TIER_TARGET;
  const mcatDelta = stats.mcat - medianMcat;
  const gpaDelta = stats.cgpa - medianCgpa;
  if (mcatDelta >= 3 && gpaDelta >= 0.05) return TIER_BASELINE;
  if (mcatDelta <= -3 || gpaDelta <= -0.08) return TIER_REACH;
  return TIER_TARGET;
}

function coverageScore(facts: SchoolFactRow[]): number {
  const important = [
    "median_mcat",
    "median_cgpa",
    "median_grad_debt",
    "pct_receiving_aid",
    "aamc_2025_2026_total_resident",
    "aamc_2025_2026_total_nonresident",
  ];
  const present = important.filter((key) => facts.some((fact) => fact.key === key)).length;
  return clamp01(present / important.length);
}

function missionOverlapScore(notes: string | null, missionTags: string[]): number {
  if (missionTags.length === 0) return 0.55;
  const bag = (notes ?? "").toLowerCase();
  const hits = missionTags.filter((tag) => bag.includes(tag.replaceAll("_", " "))).length;
  return clamp01(0.25 + hits / missionTags.length);
}

function geographyScore(state: string, prefs: ProfilePrefs): number {
  const upperState = state.toUpperCase();
  if (prefs.avoidStates.map((value) => value.toUpperCase()).includes(upperState)) return 0.05;
  if (prefs.preferStates.map((value) => value.toUpperCase()).includes(upperState)) return 1;
  if (prefs.preferStates.length === 0) return 0.55;
  return 0.35;
}

function costFamilyScore(input: {
  annualCost: number | null;
  monthlyBudget: number;
  householdChildren: number;
  coaSensitivity: number;
}): number {
  if (input.annualCost == null) return 0.45;
  const monthlyEquivalent = input.annualCost / 12;
  const pressure = monthlyEquivalent / Math.max(input.monthlyBudget, 1);
  const childFactor = input.householdChildren > 0 ? 0.08 : 0;
  const sensitivityFactor = input.coaSensitivity >= 4 ? 0.1 : 0;
  return clamp01(1.08 - pressure * 0.45 - childFactor - sensitivityFactor);
}

function researchScore(control: string, prefs: ProfilePrefs): number {
  if (prefs.prestigeResearchWeight >= 4) {
    return control === "PRIVATE" ? 0.82 : 0.72;
  }
  if (prefs.prestigeResearchWeight <= 2) return 0.5;
  return control === "PRIVATE" ? 0.68 : 0.6;
}

function heuristicsVerdict(score01: number, flags: string[]): string {
  if (flags.includes("oos_public_stat_penalty")) return "Caution: public OOS acceptance dynamics may materially reduce odds.";
  if (flags.includes("yield_protection_risk")) return "High stats profile may trigger yield protection risk at some targets.";
  if (score01 >= 0.8) return "Excellent holistic fit with strong mission and practical alignment.";
  if (score01 >= 0.65) return "Strong fit overall with manageable trade-offs.";
  if (score01 >= 0.5) return "Mixed fit: validate mission and location concerns before prioritizing.";
  return "Low fit currently: likely a reach unless key constraints change.";
}

export function computeFitScore(input: {
  stats: ProfileStats;
  prefs: ProfilePrefs;
  weights: ProfileWeights;
  wars: WarsInputs;
  school: ScoreSchoolInput;
  aiProfile?: ApplicantAiProfileForScoring | null;
}): { composite: number; breakdown: ScoreBreakdown; statTier: string; annualCost: number | null } {
  const weights = normalizeWeights(input.weights);
  const flags: string[] = [];

  const medianMcat =
    input.school.financialProfile?.medianMcat ??
    getFactNumber(input.school.facts, "median_mcat");
  const medianCgpa =
    input.school.financialProfile?.medianCgpa ??
    getFactNumber(input.school.facts, "median_cgpa");

  const tuitionResident =
    input.school.financialProfile?.tuitionResident ??
    getFactNumber(input.school.facts, "aamc_2025_2026_total_resident");
  const tuitionNonResident =
    input.school.financialProfile?.tuitionNonResident ??
    getFactNumber(input.school.facts, "aamc_2025_2026_total_nonresident");

  const avgAidAmount = getFactNumber(input.school.facts, "avg_institutional_aid_amount");
  const grantPct =
    input.school.financialProfile?.pctReceivingInstitutionalGrants ??
    getFactNumber(input.school.facts, "pct_receiving_aid");

  const selectedTuition =
    input.stats.residencyState.toUpperCase() === input.school.state.toUpperCase()
      ? tuitionResident
      : tuitionNonResident ?? tuitionResident;
  const derivedAid = avgAidAmount ?? (selectedTuition != null && grantPct != null ? (selectedTuition * grantPct) / 100 : null);
  const localRent = input.school.costOfLivingProfile?.hudTwoBedroomFairMarketRent ?? null;
  const trueCoa = calculateTrueCostOfAttendance({
    tuition: selectedTuition,
    avgAid: derivedAid,
    localRentMonthly: localRent,
  });

  const annualCost = getResidencyAwareAnnualCost(
    input.school.facts,
    input.stats.residencyState,
    input.school.state,
  );

  // ------------------------------------------------------------------
  // Stat delta vs school median — directional, independent of OOS logic.
  // Equal or better on both MCAT and GPA → 1.0. Significantly below → ~0.
  // We keep a separate *tier-selection* stat score that still applies the
  // OOS admissions-reality penalty downstream.
  // ------------------------------------------------------------------
  let statDeltaRaw01 = 0.5;
  let mcatDelta: number | null = null;
  let gpaDelta: number | null = null;
  if (medianMcat != null && medianCgpa != null) {
    mcatDelta = input.stats.mcat - medianMcat;
    gpaDelta = input.stats.cgpa - medianCgpa;
    // ±6 MCAT is the spread from bottom-decile to top-decile of matriculants.
    // ±0.12 GPA is roughly one standard deviation at most schools.
    const mcatRaw = clamp01(0.5 + mcatDelta / 6);
    const gpaRaw = clamp01(0.5 + gpaDelta / 0.12);
    statDeltaRaw01 = clamp01(mcatRaw * 0.6 + gpaRaw * 0.4);
    if (mcatDelta > 8) flags.push("high_stat_vs_median");
  } else {
    flags.push("missing_official_mcat_gpa");
  }

  let statsScore = statDeltaRaw01;

  const isOutOfState =
    input.stats.residencyState.trim().toUpperCase() !== input.school.state.trim().toUpperCase();

  // ------------------------------------------------------------------
  // Per-school OOS acceptance score (0-1). In-state applicants get a flat
  // high score (residency is a non-issue). OOS applicants get a score that
  // reflects how realistic admission actually is:
  //   - Curated oosFriendly=true: 0.75 floor (even higher if matric% strong)
  //   - Curated oosFriendly=false + public: ~0.15 (mandates in-state)
  //   - Unknown + public: ~0.45
  //   - Unknown + private (most privates): ~0.7
  //   - Published oosMatriculantPct used to fine-tune: 40%+ → strong boost
  // ------------------------------------------------------------------
  const oosFriendly = input.school.oosFriendly;
  const oosMatriculantPct = input.school.oosMatriculantPct ?? null;
  const publishedOosAcceptance =
    getFactNumber(input.school.facts, "oos_acceptance_rate") ??
    getFactNumber(input.school.facts, "public_oos_acceptance_rate");

  let oosAccept01 = 0.85;
  if (isOutOfState) {
    if (oosFriendly === true) {
      oosAccept01 = 0.75;
    } else if (oosFriendly === false) {
      oosAccept01 = 0.15;
      flags.push("oos_public_stat_penalty");
    } else if (input.school.control === "PUBLIC") {
      oosAccept01 = 0.45;
      flags.push("oos_friendliness_unknown");
    } else {
      oosAccept01 = 0.7;
    }
    if (oosMatriculantPct != null) {
      // Map 0% → 0.05, 25% → 0.55, 50%+ → 0.9. Blend with base.
      const fromMatric = clamp01(oosMatriculantPct / 60);
      oosAccept01 = clamp01(oosAccept01 * 0.55 + fromMatric * 0.45);
    } else if (publishedOosAcceptance != null) {
      const fromPublished = clamp01(publishedOosAcceptance / 50);
      oosAccept01 = clamp01(oosAccept01 * 0.7 + fromPublished * 0.3);
    }
    // Keep the historical stat-tier penalty so the BASELINE/TARGET/REACH
    // bucketing still flags unrealistic publics, but less aggressive since
    // OOS is now its own holistic component.
    if (oosFriendly === false) {
      statsScore = clamp01(statsScore * 0.5);
    } else if (oosFriendly == null && input.school.control === "PUBLIC") {
      statsScore = clamp01(statsScore * 0.75);
    }
  }

  if (
    input.stats.mcat >= 522 &&
    input.stats.cgpa >= 3.95 &&
    (input.school.strategyProfile?.hasYieldProtectionFlag ?? false)
  ) {
    flags.push("yield_protection_risk");
  }

  // Mission fit: prefer AI-extracted applicant themes (canonical vocabulary)
  // matched against the school's extracted themes. Falls back to the legacy
  // mission-tag keyword match when no AI profile is available.
  // Theme-vector alignment is the signature computation. If both applicant
  // and school have AI-scored theme weights, we do cosine similarity between
  // the two weighted vectors — this produces wide spread (perfect matches
  // near 1, orthogonal profiles near 0) which is exactly what the user
  // wants for list triage.
  let mission: number;
  let cosineAlignment: number | null = null;
  if (input.aiProfile && input.aiProfile.missionThemes.length > 0) {
    const applicantWeights = themesArrayToWeights(input.aiProfile.missionThemes);
    if (input.school.aiMission && input.school.aiMission.themes.length > 0) {
      const schoolWeights = themesArrayToWeights(input.school.aiMission.themes);
      cosineAlignment = themeVectorCosine(applicantWeights, schoolWeights);
      mission = sharpenAlignment(cosineAlignment);
    } else {
      const schoolThemes = extractSchoolMissionThemes(input.school.missionTagNotes);
      mission = missionFitFromThemes(applicantWeights, schoolThemes);
    }
  } else {
    mission = missionOverlapScore(input.school.missionTagNotes, input.prefs.missionTags);
  }

  const cost = costFamilyScore({
    annualCost,
    monthlyBudget: input.prefs.monthlyAreaRealityBudget,
    householdChildren: input.prefs.householdChildren,
    coaSensitivity: input.prefs.coaSensitivity,
  });
  const geography = geographyScore(input.school.state, input.prefs);

  // Research fit: if we have an AI-derived researchReadiness signal, use it
  // directly — this captures posters/pubs/independent projects far better
  // than the prefs slider alone. Boost at research-intensive privates.
  let research: number;
  if (input.aiProfile) {
    const base = input.aiProfile.researchReadiness / 100;
    const institutionalBoost = input.school.control === "PRIVATE" ? 0.08 : 0;
    const schoolThemes = extractSchoolMissionThemes(input.school.missionTagNotes);
    const researchSchoolBoost = schoolThemes.research || schoolThemes.academic_medicine ? 0.05 : 0;
    research = clamp01(base + institutionalBoost + researchSchoolBoost);
  } else {
    research = researchScore(input.school.control, input.prefs);
  }
  const spouseAssociations =
    Boolean(input.school.familyFriendly) || Boolean(input.school.studentAffairsUrl);
  const latestSafety = input.school.neighborhoodSafeties?.[0];
  const familySafetyNet = calculateFamilySafetyNetScore({
    neighborhoodSafetyGrade: latestSafety?.safetyGrade ?? null,
    areaSafetyComposite: latestSafety?.compositeSafetyScore ?? latestSafety?.areaVibesScore ?? null,
    rentMonthly: localRent,
    spouseAssociations,
  });
  const academicPowerhouse = calculateAcademicPowerhouseIndex({
    medianMcat,
    medianCgpa,
    researchFocusedApplicant: input.prefs.prestigeResearchWeight >= 4,
    traumaLevelCount:
      input.school.clinicalAffiliations?.filter((a) => Boolean(a.isLevel1Trauma)).length ?? 0,
    safetyNetCount:
      input.school.clinicalAffiliations?.filter((a) => Boolean(a.isSafetyNet)).length ?? 0,
    vaCount: input.school.clinicalAffiliations?.filter((a) => Boolean(a.isVA)).length ?? 0,
    hasThreeYearPathway: input.school.strategyProfile?.hasThreeYearMdPathway ?? null,
  });

  const sources = coverageScore(input.school.facts);
  if (sources < 0.5) flags.push("limited_data_coverage");
  if (annualCost == null) flags.push("missing_cost_of_attendance");

  const composite = clamp01(
    weights.stats * statsScore +
      weights.mission * mission +
      weights.colFamily * cost +
      weights.geography * geography +
      weights.research * research * (0.75 + 0.25 * sources),
  );

  // Family-first applicants earn a bonus when the school is explicitly
  // family-friendly, and a penalty when it isn't.
  const hasDependents = input.prefs.householdChildren > 0;
  let familyAdjustment = 0;
  if (hasDependents) {
    if (input.school.familyFriendly === true) familyAdjustment = 0.07;
    else if (input.school.familyFriendly === false) familyAdjustment = -0.05;
  }

  // When both AI profiles exist, use a dimension-level match:
  // for each applicant axis (research/service/etc), compare to the school's
  // matching intensity. Good matches boost, bad mismatches penalize.
  let aiDimensionMatch = 0.5;
  if (input.aiProfile && input.school.aiMission) {
    const pairs: Array<[number, number]> = [
      [input.aiProfile.researchReadiness, input.school.aiMission.researchIntensity],
      [input.aiProfile.serviceOrientation, input.school.aiMission.serviceIntensity],
      // Applicant has no explicit "rural orientation" axis — approximate from
      // mission themes if they tag rural/urban_underserved.
    ];
    const applicantWeights = themesArrayToWeights(input.aiProfile.missionThemes);
    const applicantRural = (applicantWeights.rural ?? 0) * 100;
    const applicantUrbanUnderserved = (applicantWeights.urban_underserved ?? 0) * 100;
    pairs.push([applicantRural, input.school.aiMission.ruralOrientation]);
    pairs.push([applicantUrbanUnderserved, input.school.aiMission.urbanUnderservedOrientation]);
    let agreeSum = 0;
    for (const [a, s] of pairs) {
      // 1 - normalized absolute distance. A school that wants high research
      // and applicant has high research → 1. Opposite → ~0.
      agreeSum += 1 - Math.abs(a - s) / 100;
    }
    aiDimensionMatch = clamp01(agreeSum / pairs.length);
  }

  // Holistic score blend. The ingredients:
  //   - mission  (cosine theme alignment, AI-on-AI)  → biggest lever
  //   - statDeltaRaw01 (equal/better vs median)      → adds if stats line up
  //   - oosAccept01 (per-school OOS friendliness)    → penalizes unrealistic
  //   - aiDimensionMatch (research/service axes)     → sharpens alignment
  //   - composite (weighted preferences)              → baseline sanity
  //   - familySafetyNet + academicPowerhouse          → supporting context
  const hasFullAi = Boolean(input.aiProfile && input.school.aiMission);
  const blended = hasFullAi
    ? clamp01(
        mission * 0.35 +
          statDeltaRaw01 * 0.17 +
          oosAccept01 * 0.13 +
          aiDimensionMatch * 0.13 +
          composite * 0.12 +
          (familySafetyNet / 10) * 0.05 +
          academicPowerhouse * 0.05 +
          familyAdjustment,
      )
    : clamp01(
        composite * (input.aiProfile ? 0.4 : 0.45) +
          statDeltaRaw01 * 0.2 +
          oosAccept01 * 0.15 +
          (familySafetyNet / 10) * (input.aiProfile ? 0.12 : 0.15) +
          academicPowerhouse * (input.aiProfile ? 0.13 : 0.15) +
          familyAdjustment,
      );
  // More aggressive stretch when we have AI-vs-AI signal so the list
  // actually spans red→green rather than clustering mid.
  const spread = hasFullAi
    ? Math.pow(blended, 1.4) * 1.3 - 0.08
    : Math.pow(blended, 1.25) * 1.15 - 0.05;
  const holisticScore01 = clamp01(spread);
  const holisticFitScore = Math.round(holisticScore01 * 100);
  const aiVerdict = heuristicsVerdict(holisticScore01, flags);

  return {
    composite: holisticScore01,
    annualCost: trueCoa ?? annualCost,
    breakdown: {
      stats: statsScore,
      mission,
      colFamily: cost,
      geography,
      research,
      trueCoa,
      familySafetyNet,
      academicPowerhouse,
      statFit: statsScore,
      holisticFitScore,
      aiVerdict,
      sourceCoverage: sources,
      flags,
    },
    statTier: suggestStatTier(input.stats, medianMcat, medianCgpa),
  };
}

