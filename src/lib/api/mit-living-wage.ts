export type MitLivingWageRequest = {
  state: string;
  countyFips?: string;
  countyName?: string;
  adults?: number;
  children?: number;
};

export type MitLivingWageResult = {
  monthlyLivingWage: number | null;
  currency: "USD";
  sourceLabel: "MIT Living Wage Calculator";
  sourceUrl: string;
  fetchedAt: string;
  isStub: boolean;
  notes?: string;
};

export async function fetchMitLivingWageFamilyOfThree(
  input: MitLivingWageRequest,
): Promise<MitLivingWageResult> {
  const adults = input.adults ?? 2;
  const children = input.children ?? 1;

  return {
    monthlyLivingWage: null,
    currency: "USD",
    sourceLabel: "MIT Living Wage Calculator",
    sourceUrl: "https://livingwage.mit.edu/",
    fetchedAt: new Date().toISOString(),
    isStub: true,
    notes:
      `Stub integration: map county (${input.countyFips ?? input.countyName ?? "unknown"}) ` +
      `for ${adults} adult(s) and ${children} child(ren), then parse monthly living wage.`,
  };
}

