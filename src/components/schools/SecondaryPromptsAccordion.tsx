"use client";

import { useState } from "react";

type PromptItem = {
  year: number;
  prompt: string;
};

export function SecondaryPromptsAccordion({ prompts }: { prompts: PromptItem[] }) {
  const [openYear, setOpenYear] = useState<number | null>(prompts[0]?.year ?? null);

  return (
    <section className="surface rounded-[1.6rem] p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
        Secondary Prompts (Last 3 Years)
      </h3>
      <div className="mt-4 space-y-2">
        {prompts.map((item) => {
          const open = openYear === item.year;
          return (
            <div key={item.year} className="rounded-xl border border-white/10 bg-slate-950/50">
              <button
                type="button"
                onClick={() => setOpenYear(open ? null : item.year)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <span className="text-sm font-medium text-white">{item.year}</span>
                <span className="text-xs text-slate-400">{open ? "Hide" : "Show"}</span>
              </button>
              {open && <p className="border-t border-white/10 px-4 py-3 text-sm text-slate-300">{item.prompt}</p>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

