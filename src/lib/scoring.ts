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

  let statsScore = 0.5;
  if (medianMcat != null && medianCgpa != null) {
    // Widened delta so a ±4 MCAT / ±0.08 GPA swing maps to ~0.67-0.33 rather
    // than the old compressed 0.58-0.42. Makes obvious baselines and reaches
    // visibly different on the 0-100 scale.
    const mcatScore = clamp01(0.5 + (input.stats.mcat - medianMcat) / 6);
    const gpaScore = clamp01(0.5 + (input.stats.cgpa - medianCgpa) / 0.1);
    statsScore = clamp01((mcatScore * 0.55 + gpaScore * 0.45));
    if (input.stats.mcat - medianMcat > 8) flags.push("high_stat_vs_median");
  } else {
    flags.push("missing_official_mcat_gpa");
  }

  const isOutOfState =
    input.stats.residencyState.trim().toUpperCase() !== input.school.state.trim().toUpperCase();

  // Curated OOS friendliness is the primary signal now; fall back to
  // published OOS acceptance rates if still missing.
  const oosFriendly = input.school.oosFriendly;
  const oosMatriculantPct = input.school.oosMatriculantPct ?? null;
  const publishedOosAcceptance =
    getFactNumber(input.school.facts, "oos_acceptance_rate") ??
    getFactNumber(input.school.facts, "public_oos_acceptance_rate");

  if (isOutOfState) {
    if (oosFriendly === false) {
      statsScore = clamp01(statsScore * 0.35);
      flags.push("oos_public_stat_penalty");
    } else if (oosFriendly == null && input.school.control === "PUBLIC") {
      statsScore = clamp01(statsScore * 0.6);
      flags.push("oos_friendliness_unknown");
    } else if (
      input.school.control === "PUBLIC" &&
      publishedOosAcceptance != null &&
      publishedOosAcceptance < 10
    ) {
      statsScore = clamp01(statsScore * 0.55);
      flags.push("oos_public_stat_penalty");
    }
    if (oosMatriculantPct != null && oosMatriculantPct >= 40) {
      // Very OOS-welcoming schools get a small stat-tier boost.
      statsScore = clamp01(statsScore * 1.05);
    }
  }

  if (
    input.stats.mcat >= 522 &&
    input.stats.cgpa >= 3.95 &&
    (input.school.strategyProfile?.hasYieldProtectionFlag ?? false)
  ) {
    flags.push("yield_protection_risk");
  }

  const mission = missionOverlapScore(input.school.missionTagNotes, input.prefs.missionTags);
  const cost = costFamilyScore({
    annualCost,
    monthlyBudget: input.prefs.monthlyAreaRealityBudget,
    householdChildren: input.prefs.householdChildren,
    coaSensitivity: input.prefs.coaSensitivity,
  });
  const geography = geographyScore(input.school.state, input.prefs);
  const research = researchScore(input.school.control, input.prefs);
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

  // Holistic score is anchored on the weighted composite but takes two
  // additive signals: the normalized family safety net (0-1) and academic
  // powerhouse index (0-1), plus the family-fit adjustment. We then apply
  // a mild power-curve stretch so great fits push toward 90+ and weak fits
  // drop into the 20s/30s instead of clustering in the 50-70 band.
  const blended = clamp01(
    composite * 0.6 +
      (familySafetyNet / 10) * 0.2 +
      academicPowerhouse * 0.2 +
      familyAdjustment,
  );
  const spread = Math.pow(blended, 1.25) * 1.15 - 0.05;
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

