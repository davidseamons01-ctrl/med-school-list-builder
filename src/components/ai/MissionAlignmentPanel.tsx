"use client";

import { useMemo, useState } from "react";
import { useOnboardingStore } from "@/lib/onboarding-store";

type MissionAlignmentPayload = {
  missionAlignmentScore: number;
  vibeCheck: string;
  whyUsBullets: string[];
  usedChunks: string[];
};

export function MissionAlignmentPanel({
  schoolName,
  missionStatement,
}: {
  schoolName: string;
  missionStatement: string | null;
}) {
  const draft = useOnboardingStore((s) => s.draft);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<MissionAlignmentPayload | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canRun = useMemo(
    () =>
      Boolean(missionStatement?.trim()) &&
      Boolean(draft.personalStatementDraft.trim()) &&
      Boolean(draft.meaningfulActivitiesText.trim()),
    [draft.meaningfulActivitiesText, draft.personalStatementDraft, missionStatement],
  );

  async function runAnalysis() {
    if (!canRun) {
      setError("Add mission statement, personal statement, and activity narrative first.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/ai/mission-alignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schoolName,
          missionStatement,
          personalStatement: draft.personalStatementDraft,
          activities: `${draft.meaningfulActivitiesText}\n\nResearch hours: ${draft.researchHoursClaim}`,
        }),
      });
      if (!response.ok && response.status !== 429) {
        throw new Error(`AI route failed with status ${response.status}`);
      }
      if (response.status === 429) {
        setError("Rate limit reached. Please wait and try again.");
        return;
      }
      const payload = (await response.json()) as MissionAlignmentPayload;
      setResult(payload);
    } catch (err) {
      console.error(err);
      setError("Model call failed. The page is still safe; retry when ready.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-[1.6rem] border border-white/10 bg-slate-950/50 p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-cyan-300">
        AI Mission Fit (RAG)
      </h3>
      <p className="mt-2 text-sm text-slate-400">
        Compare your personal statement + activities against this school&apos;s mission statement.
      </p>
      <button
        type="button"
        disabled={loading}
        onClick={() => void runAnalysis()}
        className="mt-4 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm font-semibold text-cyan-200 disabled:opacity-50"
      >
        {loading ? "Analyzing..." : "Run mission alignment"}
      </button>
      {error && <p className="mt-3 text-sm text-amber-300">{error}</p>}
      {result && (
        <div className="mt-4 space-y-3 text-sm">
          <p className="text-white">
            Mission Alignment Score:{" "}
            <span className="font-semibold text-cyan-300">{result.missionAlignmentScore}/100</span>
          </p>
          <p className="text-slate-300">{result.vibeCheck}</p>
          <div>
            <p className="font-medium text-white">Draft Why Us bullets</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-300">
              {result.whyUsBullets.map((bullet) => (
                <li key={bullet}>{bullet}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </section>
  );
}

