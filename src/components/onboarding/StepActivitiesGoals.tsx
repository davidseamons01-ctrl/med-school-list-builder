"use client";

import { useOnboardingStore } from "@/lib/onboarding-store";

function ambitionLabel(value: number) {
  if (value <= 2) return "Primary Care Focus";
  if (value === 3) return "Balanced";
  if (value === 4) return "Competitive Specialty";
  return "Ultra-Competitive Subspecialty";
}

export function StepActivitiesGoals() {
  const draft = useOnboardingStore((s) => s.draft);
  const updateDraft = useOnboardingStore((s) => s.updateDraft);

  return (
    <section className="surface rounded-[2rem] p-6">
      <h2 className="text-xl font-semibold text-white">Step 3 · Activities & Goals</h2>
      <p className="mt-2 text-sm text-slate-400">
        Capture ambition level and your core experience narrative.
      </p>
      <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/60 p-4">
        <div className="flex items-center justify-between">
          <label className="text-sm text-slate-300">Specialty ambition</label>
          <span className="text-xs uppercase tracking-[0.18em] text-cyan-300">
            {ambitionLabel(draft.specialtyAmbition)}
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={5}
          step={1}
          value={draft.specialtyAmbition}
          onChange={(e) =>
            updateDraft({
              specialtyAmbition: Number(e.target.value) as 1 | 2 | 3 | 4 | 5,
            })
          }
          className="mt-4 w-full accent-cyan-400"
        />
      </div>
      <label className="mt-5 block text-sm text-slate-300">
        Most meaningful activities (top 3) + context
        <textarea
          value={draft.meaningfulActivitiesText}
          onChange={(e) => updateDraft({ meaningfulActivitiesText: e.target.value })}
          rows={8}
          placeholder="Paste your top 3 most meaningful experiences and why they matter..."
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
        />
      </label>
      <label className="mt-4 block text-sm text-slate-300">
        Research hours claim
        <input
          value={draft.researchHoursClaim}
          onChange={(e) => updateDraft({ researchHoursClaim: e.target.value })}
          placeholder="e.g., 1500+"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
        />
      </label>
    </section>
  );
}

