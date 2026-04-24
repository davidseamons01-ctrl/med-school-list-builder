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

export function computeFitScore(input: {
  stats: ProfileStats;
  prefs: ProfilePrefs;
  weights: ProfileWeights;
  wars: WarsInputs;
  school: Pick<ExplorerSchool, "state" | "control" | "missionTagNotes" | "facts">;
}): { composite: number; breakdown: ScoreBreakdown; statTier: string; annualCost: number | null } {
  const weights = normalizeWeights(input.weights);
  const flags: string[] = [];

  const medianMcat = getFactNumber(input.school.facts, "median_mcat");
  const medianCgpa = getFactNumber(input.school.facts, "median_cgpa");
  const annualCost = getResidencyAwareAnnualCost(
    input.school.facts,
    input.stats.residencyState,
    input.school.state,
  );

  let statsScore = 0.5;
  if (medianMcat != null && medianCgpa != null) {
    const mcatScore = clamp01(0.5 + (input.stats.mcat - medianMcat) / 12);
    const gpaScore = clamp01(0.5 + (input.stats.cgpa - medianCgpa) / 0.18);
    statsScore = clamp01((mcatScore + gpaScore) / 2);
    if (input.stats.mcat - medianMcat > 8) flags.push("high_stat_vs_median");
  } else {
    flags.push("missing_official_mcat_gpa");
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

  return {
    composite,
    annualCost,
    breakdown: {
      stats: statsScore,
      mission,
      colFamily: cost,
      geography,
      research,
      sourceCoverage: sources,
      flags,
    },
    statTier: suggestStatTier(input.stats, medianMcat, medianCgpa),
  };
}

