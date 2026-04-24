"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { ProfilePrefs, ProfileStats } from "@/lib/types";

export const ONBOARDING_TOTAL_STEPS = 5;

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","DC","FL","GA","HI","ID","IL","IN","IA","KS","KY","LA","ME",
  "MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ","NM","NY","NC","ND","OH","OK","OR","PA","RI",
  "SC","SD","TN","TX","UT","VT","VA","WA","WV","WI","WY",
] as const;

type ResearchClinicalFocus = "research" | "clinical";
type SpecialtyAmbition = 1 | 2 | 3 | 4 | 5;

export type OnboardingDraft = {
  cgpa: number;
  sgpa: number;
  mcat: number;
  residencyState: string;
  hasStrongTies: boolean;
  strongTiesStates: string[];
  marriedOrPartnered: boolean;
  hasDependents: boolean;
  specialtyAmbition: SpecialtyAmbition;
  meaningfulActivitiesText: string;
  researchHoursClaim: string;
  focus: ResearchClinicalFocus;
  targetDebtLimit: number;
  geographicExclusions: string[];
  personalStatementDraft: string;
};

const defaultDraft: OnboardingDraft = {
  cgpa: 3.97,
  sgpa: 3.97,
  mcat: 522,
  residencyState: "ID",
  hasStrongTies: false,
  strongTiesStates: [],
  marriedOrPartnered: true,
  hasDependents: true,
  specialtyAmbition: 4,
  meaningfulActivitiesText: "",
  researchHoursClaim: "1500+",
  focus: "research",
  targetDebtLimit: 180000,
  geographicExclusions: [],
  personalStatementDraft: "",
};

type OnboardingStore = {
  step: number;
  hasUserEdited: boolean;
  draft: OnboardingDraft;
  setStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateDraft: (patch: Partial<OnboardingDraft>) => void;
  toggleStrongTieState: (state: string) => void;
  toggleGeographicExclusion: (state: string) => void;
  initializeFromProfile: (stats: ProfileStats, prefs: ProfilePrefs) => void;
  loadTestPersona: () => void;
  resetDraft: () => void;
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set, get) => ({
      step: 1,
      hasUserEdited: false,
      draft: defaultDraft,
      setStep: (step) => set({ step: Math.min(Math.max(step, 1), ONBOARDING_TOTAL_STEPS) }),
      nextStep: () =>
        set((state) => ({ step: Math.min(state.step + 1, ONBOARDING_TOTAL_STEPS) })),
      prevStep: () => set((state) => ({ step: Math.max(state.step - 1, 1) })),
      updateDraft: (patch) =>
        set((state) => ({
          hasUserEdited: true,
          draft: { ...state.draft, ...patch },
        })),
      toggleStrongTieState: (stateCode) =>
        set((state) => {
          const exists = state.draft.strongTiesStates.includes(stateCode);
          return {
            hasUserEdited: true,
            draft: {
              ...state.draft,
              strongTiesStates: exists
                ? state.draft.strongTiesStates.filter((s) => s !== stateCode)
                : [...state.draft.strongTiesStates, stateCode],
            },
          };
        }),
      toggleGeographicExclusion: (stateCode) =>
        set((state) => {
          const exists = state.draft.geographicExclusions.includes(stateCode);
          return {
            hasUserEdited: true,
            draft: {
              ...state.draft,
              geographicExclusions: exists
                ? state.draft.geographicExclusions.filter((s) => s !== stateCode)
                : [...state.draft.geographicExclusions, stateCode],
            },
          };
        }),
      initializeFromProfile: (stats, prefs) => {
        if (get().hasUserEdited) return;
        set({
          draft: {
            ...get().draft,
            cgpa: stats.cgpa ?? get().draft.cgpa,
            sgpa: stats.sgpa ?? get().draft.sgpa,
            mcat: stats.mcat ?? get().draft.mcat,
            residencyState: stats.residencyState || get().draft.residencyState,
            strongTiesStates: prefs.preferStates ?? [],
            hasStrongTies: (prefs.preferStates?.length ?? 0) > 0,
            marriedOrPartnered: (prefs.householdAdults ?? 1) > 1,
            hasDependents: (prefs.householdChildren ?? 0) > 0,
            targetDebtLimit: prefs.coaSensitivity >= 4 ? 160000 : 220000,
            geographicExclusions: prefs.avoidStates ?? [],
            focus: prefs.prestigeResearchWeight >= 4 ? "research" : "clinical",
            specialtyAmbition: prefs.prestigeResearchWeight >= 4 ? 4 : 3,
          },
        });
      },
      loadTestPersona: () =>
        set({
          hasUserEdited: true,
          draft: {
            ...defaultDraft,
            cgpa: 3.97,
            sgpa: 3.97,
            mcat: 522,
            residencyState: "ID",
            marriedOrPartnered: true,
            hasDependents: true,
            specialtyAmbition: 5,
            focus: "research",
            researchHoursClaim: "1500+",
          },
        }),
      resetDraft: () => set({ hasUserEdited: false, step: 1, draft: defaultDraft }),
    }),
    {
      name: "onboarding-wizard-v1",
      partialize: (state) => ({
        step: state.step,
        hasUserEdited: state.hasUserEdited,
        draft: state.draft,
      }),
    },
  ),
);

