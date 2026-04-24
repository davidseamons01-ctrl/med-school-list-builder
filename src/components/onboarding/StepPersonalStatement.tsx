"use client";

import { useOnboardingStore } from "@/lib/onboarding-store";

export function StepPersonalStatement() {
  const draft = useOnboardingStore((s) => s.draft);
  const updateDraft = useOnboardingStore((s) => s.updateDraft);

  return (
    <section className="surface rounded-[2rem] p-6">
      <h2 className="text-xl font-semibold text-white">Step 5 · Personal Statement</h2>
      <p className="mt-2 text-sm text-slate-400">
        Paste your current personal statement draft for future fit-analysis features.
      </p>
      <label className="mt-5 block text-sm text-slate-300">
        Personal statement draft
        <textarea
          value={draft.personalStatementDraft}
          onChange={(e) => updateDraft({ personalStatementDraft: e.target.value })}
          rows={16}
          placeholder="Paste your statement here..."
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-3 py-2.5 text-white"
        />
      </label>
      <p className="mt-3 text-xs text-slate-500">
        Characters: {draft.personalStatementDraft.length.toLocaleString()}
      </p>
    </section>
  );
}

