/**
 * State-weighted estimates of 2-bedroom HUD Fair Market Rent for FY2025.
 *
 * Data source: HUD User "Small Area Fair Market Rents / FY2025 County-Level FMRs"
 * aggregated to a state weighted average. Numbers rounded to nearest $10.
 * Reference: https://www.huduser.gov/portal/datasets/fmr.html
 *
 * These are intentionally a coarse fallback; when HUD_API_TOKEN is set we
 * will prefer the live API at the school's metro level.
 */
export const STATE_FMR_2BR_FY2025: Record<string, number> = {
  Alabama: 1170,
  Alaska: 1590,
  Arizona: 1490,
  Arkansas: 1080,
  California: 2310,
  Colorado: 1780,
  Connecticut: 1850,
  Delaware: 1540,
  "District of Columbia": 2160,
  Florida: 1780,
  Georgia: 1460,
  Hawaii: 2430,
  Idaho: 1290,
  Illinois: 1440,
  Indiana: 1150,
  Iowa: 1100,
  Kansas: 1070,
  Kentucky: 1080,
  Louisiana: 1180,
  Maine: 1450,
  Maryland: 2020,
  Massachusetts: 2040,
  Michigan: 1240,
  Minnesota: 1410,
  Mississippi: 1050,
  Missouri: 1130,
  Montana: 1220,
  Nebraska: 1150,
  Nevada: 1620,
  "New Hampshire": 1670,
  "New Jersey": 2020,
  "New Mexico": 1200,
  "New York": 2160,
  "North Carolina": 1360,
  "North Dakota": 1080,
  Ohio: 1130,
  Oklahoma: 1080,
  Oregon: 1650,
  Pennsylvania: 1300,
  "Puerto Rico": 880,
  "Rhode Island": 1630,
  "South Carolina": 1280,
  "South Dakota": 1060,
  Tennessee: 1290,
  Texas: 1470,
  Utah: 1460,
  Vermont: 1540,
  Virginia: 1770,
  Washington: 1970,
  "West Virginia": 970,
  Wisconsin: 1200,
  Wyoming: 1100,
};

export function getStateTwoBedroomFmr(state: string | null | undefined): number | null {
  if (!state) return null;
  const trimmed = state.trim();
  return STATE_FMR_2BR_FY2025[trimmed] ?? null;
}
