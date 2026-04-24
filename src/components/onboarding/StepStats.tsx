"use client";

import { US_STATES, useOnboardingStore } from "@/lib/onboarding-store";

export function StepStats() {
  const draft = useOnboardingStore((s) => s.draft);
  const updateDraft = useOnboardingStore((s) => s.updateDraft);
  const toggleStrongTieState = useOnboardingStore((s) => s.toggleStrongTieState);

  return (
    <section className="surface rounded-[2rem] p-6">
      <h2 className="text-xl font-semibold text-white">Step 1 · Stats</h2>
      <p className="mt-2 text-sm text-slate-400">
        Enter your academic profile and legal residency context.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="text-sm text-slate-300">
          cGPA
          <input
            type="number"
            step="0.01"
            value={draft.cgpa}
            onChange={(e) => updateDraft({ cgpa: Number(e.target.value) })}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
          />
        </label>
        <label className="text-sm text-slate-300">
          sGPA
          <input
            type="number"
            step="0.01"
            value={draft.sgpa}
            onChange={(e) => updateDraft({ sgpa: Number(e.target.value) })}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
          />
        </label>
        <label className="text-sm text-slate-300">
          MCAT
          <input
            type="number"
            value={draft.mcat}
            onChange={(e) => updateDraft({ mcat: Number(e.target.value) })}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
          />
        </label>
        <label className="text-sm text-slate-300">
          Legal state of residency
          <select
            value={draft.residencyState}
            onChange={(e) => updateDraft({ residencyState: e.target.value })}
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
          >
            {US_STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="mt-5 flex items-center gap-3 text-sm text-slate-300">
        <input
          type="checkbox"
          checked={draft.hasStrongTies}
          onChange={(e) =>
            updateDraft({
              hasStrongTies: e.target.checked,
              strongTiesStates: e.target.checked ? draft.strongTiesStates : [],
            })
          }
          className="h-4 w-4"
        />
        Strong ties to other states
      </label>
      {draft.hasStrongTies && (
        <div className="mt-4 grid grid-cols-5 gap-2 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
          {US_STATES.filter((state) => state !== draft.residencyState).map((state) => {
            const selected = draft.strongTiesStates.includes(state);
            return (
              <button
                key={state}
                type="button"
                onClick={() => toggleStrongTieState(state)}
                className={`rounded-lg border px-2 py-1 text-xs ${
                  selected
                    ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                    : "border-white/10 text-slate-300 hover:border-white/20"
                }`}
              >
                {state}
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

