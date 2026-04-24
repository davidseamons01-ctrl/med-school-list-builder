export type SafetyScoreRequest = {
  city?: string;
  state?: string;
  zipCode?: string;
};

export type SafetyScoreResult = {
  neighborhoodName?: string;
  zipCode?: string;
  safetyGrade: "A" | "B" | "C" | "D" | "F" | null;
  areaVibesScore: number | null;
  fbiUcrViolentRate: number | null;
  fbiUcrPropertyRate: number | null;
  compositeSafetyScore: number | null;
  sourceLabel: string;
  sourceUrl: string;
  fetchedAt: string;
  isStub: boolean;
  notes?: string;
};

export async function fetchAreaVibesSafetyScore(
  input: SafetyScoreRequest,
): Promise<SafetyScoreResult> {
  return {
    neighborhoodName: input.city,
    zipCode: input.zipCode,
    safetyGrade: null,
    areaVibesScore: null,
    fbiUcrViolentRate: null,
    fbiUcrPropertyRate: null,
    compositeSafetyScore: null,
    sourceLabel: "AreaVibes",
    sourceUrl: "https://www.areavibes.com/",
    fetchedAt: new Date().toISOString(),
    isStub: true,
    notes: "Stub integration: resolve neighborhood and parse safety letter grade (A-F).",
  };
}

export async function fetchFbiUcrSafetyRates(
  input: SafetyScoreRequest,
): Promise<SafetyScoreResult> {
  return {
    neighborhoodName: input.city,
    zipCode: input.zipCode,
    safetyGrade: null,
    areaVibesScore: null,
    fbiUcrViolentRate: null,
    fbiUcrPropertyRate: null,
    compositeSafetyScore: null,
    sourceLabel: "FBI UCR",
    sourceUrl: "https://cde.ucr.cjis.gov/LATEST/webapp/#/pages/home",
    fetchedAt: new Date().toISOString(),
    isStub: true,
    notes: "Stub integration: map agency/geography and parse violent/property crime rates.",
  };
}

