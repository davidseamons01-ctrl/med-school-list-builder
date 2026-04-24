"use client";

import { useEffect, useMemo, useState } from "react";
import type { ProfilePrefs, ProfileStats, ProfileWeights, WarsInputs } from "@/lib/types";
import { ONBOARDING_TOTAL_STEPS, useOnboardingStore } from "@/lib/onboarding-store";
import { StepStats } from "./StepStats";
import { StepDemographicsFamily } from "./StepDemographicsFamily";
import { StepActivitiesGoals } from "./StepActivitiesGoals";
import { StepPreferences } from "./StepPreferences";
import { StepPersonalStatement } from "./StepPersonalStatement";

type OnboardingWizardProps = {
  initialProfile: {
    displayName: string | null | undefined;
    stats: ProfileStats;
    prefs: ProfilePrefs;
    weights: ProfileWeights;
    wars: WarsInputs;
  };
  saveAction: (formData: FormData) => Promise<void>;
};

const STEP_LABELS = [
  "Stats",
  "Demographics & Family",
  "Activities & Goals",
  "Preferences",
  "Personal Statement",
] as const;

export function OnboardingWizard({ initialProfile, saveAction }: OnboardingWizardProps) {
  const step = useOnboardingStore((s) => s.step);
  const draft = useOnboardingStore((s) => s.draft);
  const setStep = useOnboardingStore((s) => s.setStep);
  const nextStep = useOnboardingStore((s) => s.nextStep);
  const prevStep = useOnboardingStore((s) => s.prevStep);
  const initializeFromProfile = useOnboardingStore((s) => s.initializeFromProfile);
  const loadTestPersona = useOnboardingStore((s) => s.loadTestPersona);
  const resetDraft = useOnboardingStore((s) => s.resetDraft);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    initializeFromProfile(initialProfile.stats, initialProfile.prefs);
  }, [initialProfile.prefs, initialProfile.stats, initializeFromProfile]);

  const stepComponent = useMemo(() => {
    if (step === 1) return <StepStats />;
    if (step === 2) return <StepDemographicsFamily />;
    if (step === 3) return <StepActivitiesGoals />;
    if (step === 4) return <StepPreferences />;
    return <StepPersonalStatement />;
  }, [step]);

  const missionTags = draft.focus === "research" ? "research_intensive, health_equity" : "primary_care, community_service";
  const prestigeResearchWeight = draft.focus === "research" ? 5 : 2;
  const specialtyInterest =
    draft.specialtyAmbition >= 5
      ? "ultra_competitive_subspecialty"
      : draft.specialtyAmbition >= 4
        ? "competitive_specialties"
        : "broad_clinical";
  const familyPriority = draft.marriedOrPartnered || draft.hasDependents ? 5 : 3;
  const coaSensitivity = draft.targetDebtLimit <= 160000 ? 5 : draft.targetDebtLimit <= 220000 ? 4 : 3;
  const wResearch = draft.focus === "research" ? 0.32 : 0.14;
  const wStats = draft.specialtyAmbition >= 4 ? 0.3 : 0.24;
  const wMission = 0.18;
  const wColFamily = draft.hasDependents ? 0.28 : 0.22;
  const wGeography = 1 - (wResearch + wStats + wMission + wColFamily);
  const adults = draft.marriedOrPartnered ? 2 : 1;
  const children = draft.hasDependents ? 1 : 0;
  const clinicalHours = draft.meaningfulActivitiesText.trim().length > 0 ? 800 : 400;
  const parsedResearchHours = Number(draft.researchHoursClaim.replace(/[^\d]/g, ""));
  const researchHours = Number.isFinite(parsedResearchHours) && parsedResearchHours > 0 ? parsedResearchHours : 1500;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="surface rounded-[2rem] p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">
              Multi-step onboarding
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
              Build your personalized application strategy profile
            </h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              Global state is stored with zustand and persisted in local storage, so page refreshes will not erase your progress.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={loadTestPersona}
              className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-200"
            >
              Load test persona
            </button>
            <button
              type="button"
              onClick={resetDraft}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-semibold text-slate-300"
            >
              Reset local draft
            </button>
          </div>
        </div>
        <div className="mt-6 grid gap-2 sm:grid-cols-5">
          {STEP_LABELS.map((label, index) => {
            const stepNum = index + 1;
            const active = stepNum === step;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setStep(stepNum)}
                className={`rounded-2xl border px-3 py-2 text-left text-xs ${
                  active
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                    : "border-white/10 text-slate-400 hover:border-white/20"
                }`}
              >
                <div className="font-semibold">Step {stepNum}</div>
                <div className="mt-1">{label}</div>
              </button>
            );
          })}
        </div>
      </div>

      {stepComponent}

      <div className="surface rounded-[2rem] p-6">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Navigation</h3>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <button
            type="button"
            onClick={prevStep}
            disabled={step <= 1}
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-200 disabled:opacity-50"
          >
            Previous
          </button>
          <div className="text-sm text-slate-400">
            Step {step} of {ONBOARDING_TOTAL_STEPS}
          </div>
          <button
            type="button"
            onClick={nextStep}
            disabled={step >= ONBOARDING_TOTAL_STEPS}
            className="rounded-full border border-white/10 px-5 py-2.5 text-sm text-slate-200 disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {step === ONBOARDING_TOTAL_STEPS && (
        <form
          action={async (formData: FormData) => {
            await saveAction(formData);
            setSaved(true);
          }}
          className="surface rounded-[2rem] p-6"
        >
          <h3 className="text-lg font-semibold text-white">Finalize and save profile</h3>
          <p className="mt-2 text-sm text-slate-400">
            This submits your wizard data into the app scoring profile.
          </p>

          <input type="hidden" name="displayName" value={initialProfile.displayName ?? "Applicant"} />
          <input type="hidden" name="cgpa" value={String(draft.cgpa)} />
          <input type="hidden" name="sgpa" value={String(draft.sgpa)} />
          <input type="hidden" name="mcat" value={String(draft.mcat)} />
          <input type="hidden" name="residencyState" value={draft.residencyState} />
          <input type="hidden" name="programType" value="MD" />
          <input type="hidden" name="specialtyInterest" value={specialtyInterest} />
          <input type="hidden" name="missionTags" value={missionTags} />
          <input type="hidden" name="preferStates" value={draft.strongTiesStates.join(",")} />
          <input type="hidden" name="avoidStates" value={draft.geographicExclusions.join(",")} />
          <input type="hidden" name="familyPriority" value={String(familyPriority)} />
          <input type="hidden" name="coaSensitivity" value={String(coaSensitivity)} />
          <input type="hidden" name="prestigeResearchWeight" value={String(prestigeResearchWeight)} />
          <input type="hidden" name="monthlyHousingBudget" value={String(initialProfile.prefs.monthlyHousingBudget ?? 1800)} />
          <input type="hidden" name="monthlyAreaRealityBudget" value={String(initialProfile.prefs.monthlyAreaRealityBudget ?? 3000)} />
          <input type="hidden" name="householdAdults" value={String(adults)} />
          <input type="hidden" name="householdChildren" value={String(children)} />
          <input type="hidden" name="w_stats" value={String(wStats)} />
          <input type="hidden" name="w_mission" value={String(wMission)} />
          <input type="hidden" name="w_colFamily" value={String(wColFamily)} />
          <input type="hidden" name="w_geography" value={String(wGeography)} />
          <input type="hidden" name="w_research" value={String(wResearch)} />
          <input type="hidden" name="clinicalHours" value={String(clinicalHours)} />
          <input type="hidden" name="researchHours" value={String(researchHours)} />
          <input type="hidden" name="volunteeringHours" value={String(initialProfile.wars.volunteeringHours ?? 300)} />
          <input type="hidden" name="leadershipFlag" value="on" />
          <input type="hidden" name="wantsArcGisExplorer" value="on" />

          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button
              type="submit"
              className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
            >
              Save onboarding profile
            </button>
            {saved && <span className="text-sm text-emerald-300">Saved successfully.</span>}
          </div>
        </form>
      )}
    </div>
  );
}

