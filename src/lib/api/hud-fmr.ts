import { getStateTwoBedroomFmr } from "../../../scripts/data/state-2br-fmr-fy2025";

export type HudFmrRequest = {
  zipCode?: string;
  state?: string;
  countyFips?: string;
  bedrooms?: 2;
};

export type HudFmrResult = {
  zipCode: string | null;
  state: string | null;
  bedrooms: 2;
  fairMarketRentMonthly: number | null;
  currency: "USD";
  sourceLabel: "HUD Fair Market Rent (FY2025)" | "HUD Fair Market Rent (FY2025 state average fallback)";
  sourceUrl: string;
  fetchedAt: string;
  isFallback: boolean;
  notes?: string;
};

const HUD_BASE = "https://www.huduser.gov/hudapi/public";

async function fetchHudLive(
  input: HudFmrRequest,
  token: string,
): Promise<number | null> {
  try {
    if (input.zipCode) {
      const res = await fetch(`${HUD_BASE}/fmr/data/${input.zipCode}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return null;
      const body = (await res.json()) as {
        data?: { basicdata?: Array<{ "Two-Bedroom"?: number }> };
      };
      const bd = body.data?.basicdata;
      if (bd && bd.length > 0) {
        const v = bd[0]["Two-Bedroom"];
        return typeof v === "number" ? v : null;
      }
    }
    if (input.countyFips) {
      const res = await fetch(`${HUD_BASE}/fmr/data/${input.countyFips}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      });
      if (!res.ok) return null;
      const body = (await res.json()) as {
        data?: { basicdata?: { "Two-Bedroom"?: number } };
      };
      const v = body.data?.basicdata?.["Two-Bedroom"];
      return typeof v === "number" ? v : null;
    }
  } catch {
    return null;
  }
  return null;
}

export async function fetchHudTwoBedroomFairMarketRent(
  input: HudFmrRequest,
): Promise<HudFmrResult> {
  const token = process.env.HUD_API_TOKEN;
  let monthly: number | null = null;
  let isFallback = true;
  let label: HudFmrResult["sourceLabel"] =
    "HUD Fair Market Rent (FY2025 state average fallback)";

  if (token && (input.zipCode || input.countyFips)) {
    const live = await fetchHudLive(input, token);
    if (live != null) {
      monthly = Math.round(live);
      isFallback = false;
      label = "HUD Fair Market Rent (FY2025)";
    }
  }

  if (monthly == null) {
    monthly = getStateTwoBedroomFmr(input.state ?? null);
  }

  return {
    zipCode: input.zipCode ?? null,
    state: input.state ?? null,
    bedrooms: 2,
    fairMarketRentMonthly: monthly,
    currency: "USD",
    sourceLabel: label,
    sourceUrl: "https://www.huduser.gov/portal/datasets/fmr.html",
    fetchedAt: new Date().toISOString(),
    isFallback,
    notes: isFallback
      ? "State-level FY2025 weighted average used; set HUD_API_TOKEN and populate school.zip or countyFips for metro-accurate live rent."
      : undefined,
  };
}
