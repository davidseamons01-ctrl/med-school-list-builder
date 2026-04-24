"use client";

import { useOnboardingStore } from "@/lib/onboarding-store";

export function StepDemographicsFamily() {
  const draft = useOnboardingStore((s) => s.draft);
  const updateDraft = useOnboardingStore((s) => s.updateDraft);

  return (
    <section className="surface rounded-[2rem] p-6">
      <h2 className="text-xl font-semibold text-white">Step 2 · Demographics & Family</h2>
      <p className="mt-2 text-sm text-slate-400">
        These toggles drive future COL and support-system weighting.
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => updateDraft({ marriedOrPartnered: !draft.marriedOrPartnered })}
          className={`rounded-2xl border p-4 text-left ${
            draft.marriedOrPartnered
              ? "border-cyan-400/40 bg-cyan-400/10"
              : "border-white/10 bg-slate-950/60"
          }`}
        >
          <p className="text-sm text-slate-300">Married / Partnered</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {draft.marriedOrPartnered ? "Yes" : "No"}
          </p>
        </button>
        <button
          type="button"
          onClick={() => updateDraft({ hasDependents: !draft.hasDependents })}
          className={`rounded-2xl border p-4 text-left ${
            draft.hasDependents
              ? "border-cyan-400/40 bg-cyan-400/10"
              : "border-white/10 bg-slate-950/60"
          }`}
        >
          <p className="text-sm text-slate-300">Dependents</p>
          <p className="mt-2 text-lg font-semibold text-white">
            {draft.hasDependents ? "Yes" : "No"}
          </p>
        </button>
      </div>
      <p className="mt-4 text-sm text-slate-400">
        Household snapshot: {draft.marriedOrPartnered ? "2 adults" : "1 adult"} ·{" "}
        {draft.hasDependents ? "has dependents" : "no dependents"}
      </p>
    </section>
  );
}

