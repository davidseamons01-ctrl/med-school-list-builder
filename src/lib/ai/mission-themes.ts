/**
 * Canonical mission-theme vocabulary shared by applicant profiles and
 * medical-school mission statements. Both sides reduce their narrative
 * signals down to this small set so we can compute overlap deterministically
 * and cheaply, with zero per-school LLM calls.
 */

export const MISSION_THEMES = [
  "primary_care",
  "rural",
  "urban_underserved",
  "research",
  "academic_medicine",
  "health_equity",
  "community_engagement",
  "global_health",
  "service",
  "military",
  "innovation_tech",
  "leadership",
  "family_medicine",
  "psychiatry_mental_health",
  "pediatrics",
] as const;

export type MissionTheme = (typeof MISSION_THEMES)[number];

const THEME_KEYWORDS: Record<MissionTheme, string[]> = {
  primary_care: ["primary care", "general medicine", "internal medicine", "family medicine"],
  rural: ["rural", "frontier", "farm", "small town", "underserved rural"],
  urban_underserved: ["urban underserved", "inner city", "safety net", "medically underserved", "uninsured", "low-income"],
  research: ["research", "bench", "translational", "lab", "biomedical research", "clinical research"],
  academic_medicine: ["academic medicine", "faculty", "training future", "medical education", "educator"],
  health_equity: ["equity", "disparities", "diversity", "anti-racism", "social justice", "inclusion"],
  community_engagement: ["community engagement", "community outreach", "community-based", "community service", "free clinic"],
  global_health: ["global health", "international", "tropical medicine", "refugee", "migrant"],
  service: ["service", "mission-driven", "volunteer", "giving back", "servant leader"],
  military: ["military", "veteran", "armed forces", "uniformed", "usu", "hpsp"],
  innovation_tech: ["innovation", "technology", "ai", "digital health", "entrepreneurship", "biotech"],
  leadership: ["leadership", "administrative", "health policy", "systems leader", "chief"],
  family_medicine: ["family medicine", "family physician"],
  psychiatry_mental_health: ["psychiatry", "mental health", "behavioral health", "substance use"],
  pediatrics: ["pediatric", "child", "adolescent", "neonatal"],
};

function normalize(input: string | null | undefined): string {
  return (input ?? "").toLowerCase();
}

/**
 * Deterministically extract themes from a free-text mission blurb by keyword
 * matching against our canonical vocabulary. Returns a weighted map where
 * each matched theme scores 1.0 (we do not currently soft-score schools).
 */
export function extractSchoolMissionThemes(
  missionTagNotes: string | null | undefined,
): Record<MissionTheme, number> {
  const text = normalize(missionTagNotes);
  const result = {} as Record<MissionTheme, number>;
  for (const theme of MISSION_THEMES) {
    const keywords = THEME_KEYWORDS[theme];
    const hit = keywords.some((keyword) => text.includes(keyword));
    if (hit) result[theme] = 1;
  }
  return result;
}

export type ApplicantThemeWeights = Partial<Record<MissionTheme, number>>;

/**
 * Compute mission fit as a weighted cosine-style overlap.
 * Returns 0-1. A stable floor of 0.25 lets a school with no detectable
 * mission signal still be a viable option.
 */
export function missionFitFromThemes(
  applicantThemes: ApplicantThemeWeights,
  schoolThemes: Record<MissionTheme, number>,
): number {
  const applicantEntries = Object.entries(applicantThemes) as Array<[MissionTheme, number]>;
  const schoolEntries = Object.entries(schoolThemes) as Array<[MissionTheme, number]>;
  if (applicantEntries.length === 0 || schoolEntries.length === 0) return 0.45;

  const schoolSet = new Set(schoolEntries.map(([k]) => k));
  let sharedWeight = 0;
  let applicantWeightTotal = 0;
  for (const [theme, weight] of applicantEntries) {
    applicantWeightTotal += weight;
    if (schoolSet.has(theme)) sharedWeight += weight;
  }
  if (applicantWeightTotal === 0) return 0.45;

  const coverage = sharedWeight / applicantWeightTotal;
  // Coverage of 0 yields a 0.25 floor. Coverage of 1 yields 0.95.
  return Math.max(0.25, Math.min(0.95, 0.25 + coverage * 0.7));
}
