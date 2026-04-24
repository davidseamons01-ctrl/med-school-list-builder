export type HudFmrRequest = {
  zipCode: string;
  bedrooms?: 2;
};

export type HudFmrResult = {
  zipCode: string;
  bedrooms: 2;
  fairMarketRentMonthly: number | null;
  currency: "USD";
  sourceLabel: "HUD Fair Market Rent";
  sourceUrl: string;
  fetchedAt: string;
  isStub: boolean;
  notes?: string;
};

export async function fetchHudTwoBedroomFairMarketRent(
  input: HudFmrRequest,
): Promise<HudFmrResult> {
  return {
    zipCode: input.zipCode,
    bedrooms: 2,
    fairMarketRentMonthly: null,
    currency: "USD",
    sourceLabel: "HUD Fair Market Rent",
    sourceUrl: "https://www.huduser.gov/portal/datasets/fmr.html",
    fetchedAt: new Date().toISOString(),
    isStub: true,
    notes:
      "Stub integration: call HUD FMR endpoint/dataset for ZIP-to-metro mapping and extract 2-bedroom monthly rent.",
  };
}

