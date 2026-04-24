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

export type ThemeWeights = Partial<Record<MissionTheme, number>>;

/**
 * Legacy coverage-style overlap (used when the school only has keyword-
 * extracted themes, i.e. a flat 0/1 vector). Kept so fallback behavior is
 * predictable.
 */
export function missionFitFromThemes(
  applicantThemes: ThemeWeights,
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
  return Math.max(0.25, Math.min(0.95, 0.25 + coverage * 0.7));
}

/**
 * Cosine similarity between two weighted theme vectors. Perfect alignment
 * (same themes, same weights) → 1. Orthogonal (no shared themes) → 0.
 * This is the primary signal for AI-vs-AI matching: the bigger the theme
 * mismatch, the lower the score, exactly what we want for list triage.
 */
export function themeVectorCosine(
  applicantThemes: ThemeWeights,
  schoolThemes: ThemeWeights,
): number {
  const keys = new Set<MissionTheme>();
  for (const k of Object.keys(applicantThemes) as MissionTheme[]) keys.add(k);
  for (const k of Object.keys(schoolThemes) as MissionTheme[]) keys.add(k);
  if (keys.size === 0) return 0;

  let dot = 0;
  let aMag = 0;
  let bMag = 0;
  for (const k of keys) {
    const a = applicantThemes[k] ?? 0;
    const b = schoolThemes[k] ?? 0;
    dot += a * b;
    aMag += a * a;
    bMag += b * b;
  }
  if (aMag === 0 || bMag === 0) return 0;
  return dot / (Math.sqrt(aMag) * Math.sqrt(bMag));
}

/**
 * Sharpen a raw cosine similarity into the kind of spread the user wants:
 * strong matches stretch toward the top, weak matches fall off fast.
 * Output is clamped to [0.08, 0.98] so we never claim perfect certainty and
 * never hand out flat zeros.
 */
export function sharpenAlignment(cosine: number): number {
  const clamped = Math.max(0, Math.min(1, cosine));
  const stretched = Math.pow(clamped, 0.85);
  return Math.max(0.08, Math.min(0.98, stretched));
}
