"use client";

import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export interface BasicStats {
  cgpa: number;
  sgpa: number;
  mcat: number;
  residencyState: string;
}

export interface ActivityItem {
  title: string;
  description: string;
  isMostMeaningful: boolean;
  hours: number;
}

export interface FamilyStatus {
  isMarried: boolean;
  dependents: number;
}

export interface OnboardingDraft {
  basicStats: BasicStats;
  strongTieStates: string[];
  familyStatus: FamilyStatus;
  activities: ActivityItem[];
  personalStatement: string;
  dealbreakers: string[];
}

interface OnboardingStore {
  draft: OnboardingDraft;
  setCgpa: (value: number) => void;
  setSgpa: (value: number) => void;
  setMcat: (value: number) => void;
  setResidencyState: (value: string) => void;
  setStrongTieStates: (states: string[]) => void;
  addStrongTieState: (state: string) => void;
  removeStrongTieState: (state: string) => void;
  setIsMarried: (value: boolean) => void;
  setDependents: (value: number) => void;
  setActivities: (activities: ActivityItem[]) => void;
  addActivity: (activity: ActivityItem) => void;
  updateActivity: (index: number, activity: Partial<ActivityItem>) => void;
  removeActivity: (index: number) => void;
  setPersonalStatement: (value: string) => void;
  setDealbreakers: (items: string[]) => void;
  addDealbreaker: (item: string) => void;
  removeDealbreaker: (item: string) => void;
  resetOnboarding: () => void;
}

const defaultDraft: OnboardingDraft = {
  basicStats: {
    cgpa: 0,
    sgpa: 0,
    mcat: 0,
    residencyState: "",
  },
  strongTieStates: [],
  familyStatus: {
    isMarried: false,
    dependents: 0,
  },
  activities: [],
  personalStatement: "",
  dealbreakers: [],
};

export const useOnboardingStore = create<OnboardingStore>()(
  persist(
    (set) => ({
      draft: defaultDraft,
      setCgpa: (value) =>
        set((state) => ({
          draft: { ...state.draft, basicStats: { ...state.draft.basicStats, cgpa: value } },
        })),
      setSgpa: (value) =>
        set((state) => ({
          draft: { ...state.draft, basicStats: { ...state.draft.basicStats, sgpa: value } },
        })),
      setMcat: (value) =>
        set((state) => ({
          draft: { ...state.draft, basicStats: { ...state.draft.basicStats, mcat: value } },
        })),
      setResidencyState: (value) =>
        set((state) => ({
          draft: { ...state.draft, basicStats: { ...state.draft.basicStats, residencyState: value } },
        })),
      setStrongTieStates: (states) =>
        set((state) => ({
          draft: { ...state.draft, strongTieStates: states },
        })),
      addStrongTieState: (stateCode) =>
        set((state) => ({
          draft: state.draft.strongTieStates.includes(stateCode)
            ? state.draft
            : { ...state.draft, strongTieStates: [...state.draft.strongTieStates, stateCode] },
        })),
      removeStrongTieState: (stateCode) =>
        set((state) => ({
          draft: {
            ...state.draft,
            strongTieStates: state.draft.strongTieStates.filter((item) => item !== stateCode),
          },
        })),
      setIsMarried: (value) =>
        set((state) => ({
          draft: { ...state.draft, familyStatus: { ...state.draft.familyStatus, isMarried: value } },
        })),
      setDependents: (value) =>
        set((state) => ({
          draft: {
            ...state.draft,
            familyStatus: { ...state.draft.familyStatus, dependents: Math.max(0, value) },
          },
        })),
      setActivities: (activities) =>
        set((state) => ({
          draft: { ...state.draft, activities },
        })),
      addActivity: (activity) =>
        set((state) => ({
          draft: { ...state.draft, activities: [...state.draft.activities, activity] },
        })),
      updateActivity: (index, activityPatch) =>
        set((state) => ({
          draft: {
            ...state.draft,
            activities: state.draft.activities.map((activity, i) =>
              i === index ? { ...activity, ...activityPatch } : activity,
            ),
          },
        })),
      removeActivity: (index) =>
        set((state) => ({
          draft: {
            ...state.draft,
            activities: state.draft.activities.filter((_, i) => i !== index),
          },
        })),
      setPersonalStatement: (value) =>
        set((state) => ({
          draft: { ...state.draft, personalStatement: value },
        })),
      setDealbreakers: (items) =>
        set((state) => ({
          draft: { ...state.draft, dealbreakers: items },
        })),
      addDealbreaker: (item) =>
        set((state) => ({
          draft: state.draft.dealbreakers.includes(item)
            ? state.draft
            : { ...state.draft, dealbreakers: [...state.draft.dealbreakers, item] },
        })),
      removeDealbreaker: (item) =>
        set((state) => ({
          draft: {
            ...state.draft,
            dealbreakers: state.draft.dealbreakers.filter((current) => current !== item),
          },
        })),
      resetOnboarding: () => set({ draft: defaultDraft }),
    }),
    {
      name: "onboarding-wizard-storage-v1",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ draft: state.draft }),
    },
  ),
);
