"use client";

import { US_STATES, useOnboardingStore } from "@/lib/onboarding-store";

export function StepPreferences() {
  const draft = useOnboardingStore((s) => s.draft);
  const updateDraft = useOnboardingStore((s) => s.updateDraft);
  const toggleGeographicExclusion = useOnboardingStore((s) => s.toggleGeographicExclusion);

  return (
    <section className="surface rounded-[2rem] p-6">
      <h2 className="text-xl font-semibold text-white">Step 4 · Preferences</h2>
      <p className="mt-2 text-sm text-slate-400">
        Define your strategic preferences for fit and school list shaping.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <button
          type="button"
          onClick={() => updateDraft({ focus: "research" })}
          className={`rounded-2xl border p-4 text-left ${
            draft.focus === "research"
              ? "border-cyan-400/40 bg-cyan-400/10"
              : "border-white/10 bg-slate-950/60"
          }`}
        >
          <p className="text-sm text-slate-300">Research focus</p>
          <p className="mt-2 text-lg font-semibold text-white">Research-heavy programs</p>
        </button>
        <button
          type="button"
          onClick={() => updateDraft({ focus: "clinical" })}
          className={`rounded-2xl border p-4 text-left ${
            draft.focus === "clinical"
              ? "border-cyan-400/40 bg-cyan-400/10"
              : "border-white/10 bg-slate-950/60"
          }`}
        >
          <p className="text-sm text-slate-300">Clinical focus</p>
          <p className="mt-2 text-lg font-semibold text-white">Hands-on clinical training</p>
        </button>
      </div>
      <label className="mt-5 block text-sm text-slate-300">
        Target debt limit (USD)
        <input
          type="number"
          value={draft.targetDebtLimit}
          onChange={(e) => updateDraft({ targetDebtLimit: Number(e.target.value) })}
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
        />
      </label>
      <div className="mt-5">
        <p className="text-sm text-slate-300">Geographic exclusions (checklist)</p>
        <p className="mt-1 text-xs text-slate-500">
          Quick map-style grid: click states you want to exclude.
        </p>
        <div className="mt-3 grid grid-cols-7 gap-2 rounded-2xl border border-white/10 bg-slate-950/70 p-3">
          {US_STATES.map((state) => {
            const selected = draft.geographicExclusions.includes(state);
            return (
              <button
                key={state}
                type="button"
                onClick={() => toggleGeographicExclusion(state)}
                className={`rounded-md border px-1.5 py-1 text-xs ${
                  selected
                    ? "border-rose-400/50 bg-rose-500/10 text-rose-200"
                    : "border-white/10 text-slate-300 hover:border-white/20"
                }`}
              >
                {state}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

