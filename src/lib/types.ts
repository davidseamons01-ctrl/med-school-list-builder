export type ProfileStats = {
  cgpa: number;
  sgpa: number;
  mcat: number;
  residencyState: string;
  programType: string;
  specialtyInterest: string;
};

export type ProfilePrefs = {
  missionTags: string[];
  avoidStates: string[];
  preferStates: string[];
  familyPriority: number;
  coaSensitivity: number;
  prestigeResearchWeight: number;
  monthlyHousingBudget: number;
  monthlyAreaRealityBudget: number;
  householdAdults: number;
  householdChildren: number;
  wantsArcGisExplorer: boolean;
};

export type ProfileWeights = {
  stats: number;
  mission: number;
  colFamily: number;
  geography: number;
  research: number;
};

export type WarsInputs = {
  clinicalHours: number;
  researchHours: number;
  volunteeringHours: number;
  leadershipFlag: boolean;
};

export type ScoreBreakdown = {
  stats: number;
  mission: number;
  colFamily: number;
  geography: number;
  research: number;
  sourceCoverage: number;
  flags: string[];
};

export type SchoolFactRow = {
  key: string;
  category: string;
  label: string;
  valueJson: string;
  valueType: string;
  unit: string | null;
  sourceType: string;
  sourceLabel: string | null;
  sourceUrl: string | null;
  retrievedAt: Date | string | null;
  isVerified: boolean;
  isSeeded: boolean;
  notes: string | null;
};

export type ExplorerSchool = {
  id: string;
  slug: string;
  name: string;
  city: string;
  state: string;
  control: string;
  lat: number | null;
  lng: number | null;
  zip: string | null;
  countyName: string | null;
  countyFips: string | null;
  missionTagNotes: string | null;
  websiteUrl: string | null;
  admissionsUrl: string | null;
  studentAffairsUrl: string | null;
  financialAidUrl: string | null;
  secondaryPromptsUrl: string | null;
  facts: SchoolFactRow[];
};

export const MISSION_TAG_OPTIONS = [
  "rural_health",
  "underserved_urban",
  "health_equity",
  "primary_care",
  "research_intensive",
  "community_service",
  "spanish_speaking_populations",
  "family_supportive",
  "low_debt",
  "military_medicine",
] as const;

export const TIER_BASELINE = "BASELINE";
export const TIER_TARGET = "TARGET";
export const TIER_REACH = "REACH";

export const APPLY_STATUSES = [
  "NONE",
  "CONSIDERING",
  "APPLY",
  "SECONDARY",
  "INTERVIEW",
  "ACCEPTED",
  "WITHDRAWN",
  "SKIP",
] as const;

