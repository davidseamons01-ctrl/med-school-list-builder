"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles, Brain, TriangleAlert, RefreshCw, Check } from "lucide-react";
import { useOnboardingStore } from "@/store/useOnboardingStore";

type Theme = { theme: string; weight: number };

type AiProfile = {
  id: string;
  generatedAt: string;
  updatedAt: string;
  model: string;
  academicStrength: number;
  clinicalDepth: number;
  researchReadiness: number;
  serviceOrientation: number;
  leadershipImpact: number;
  narrativeCoherence: number;
  missionThemes: Theme[];
  archetypes: string[];
  strengths: string[];
  gaps: string[];
  redFlags: string[];
  narrativeSummary: string;
};

type Props = {
  fallbackMcat: number;
  fallbackCgpa: number;
  fallbackResidencyState: string;
  fallbackMissionTags: string[];
  fallbackSpecialtyInterest: string;
};

const DIMENSIONS: Array<{ key: keyof AiProfile; label: string; hint: string }> = [
  { key: "academicStrength", label: "Academic Strength", hint: "MCAT + GPA vs. national applicant pool" },
  { key: "clinicalDepth", label: "Clinical Depth", hint: "Patient-contact hours & role quality" },
  { key: "researchReadiness", label: "Research Readiness", hint: "Pubs, posters, project ownership" },
  { key: "serviceOrientation", label: "Service Orientation", hint: "Sustained service to underserved" },
  { key: "leadershipImpact", label: "Leadership Impact", hint: "Founded/led/grew with results" },
  { key: "narrativeCoherence", label: "Narrative Coherence", hint: "How well the PS ties activities together" },
];

function scoreTone(score: number) {
  if (score >= 80) return "text-emerald-300 bg-emerald-400/10 border-emerald-400/30";
  if (score >= 60) return "text-cyan-200 bg-cyan-400/10 border-cyan-400/30";
  if (score >= 45) return "text-amber-200 bg-amber-400/10 border-amber-400/30";
  return "text-rose-200 bg-rose-400/10 border-rose-400/30";
}

function themeLabel(theme: string): string {
  return theme
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ApplicantAiProfileCard({
  fallbackMcat,
  fallbackCgpa,
  fallbackResidencyState,
  fallbackMissionTags,
  fallbackSpecialtyInterest,
}: Props) {
  const draft = useOnboardingStore((s) => s.draft);
  const [ai, setAi] = useState<AiProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetch("/api/ai/generate-applicant-profile", { method: "GET", cache: "no-store" })
      .then(async (r) => (r.ok ? await r.json() : null))
      .then((payload) => {
        if (!active) return;
        if (payload?.ai) setAi(payload.ai as AiProfile);
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const hasMaterial = useMemo(() => {
    return (
      (draft.personalStatement.trim().length > 120 || draft.activities.length > 0) &&
      (draft.basicStats.mcat > 0 || fallbackMcat > 0)
    );
  }, [draft, fallbackMcat]);

  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);
    try {
      const body = {
        stats: {
          mcat: draft.basicStats.mcat || fallbackMcat,
          cgpa: draft.basicStats.cgpa || fallbackCgpa,
          sgpa: draft.basicStats.sgpa || null,
          residencyState: draft.basicStats.residencyState || fallbackResidencyState,
          specialtyInterest: fallbackSpecialtyInterest,
        },
        demographics: {
          isMarried: draft.familyStatus.isMarried,
          householdChildren: draft.familyStatus.dependents,
          strongTiesStates: draft.strongTieStates,
        },
        activities: draft.activities,
        personalStatement: draft.personalStatement,
        missionTags: fallbackMissionTags,
        dealbreakers: draft.dealbreakers,
      };
      const response = await fetch("/api/ai/generate-applicant-profile", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload?.message ?? payload?.error ?? "Generation failed");
        return;
      }
      const refreshed = await fetch("/api/ai/generate-applicant-profile", { cache: "no-store" });
      const refreshedPayload = await refreshed.json();
      if (refreshedPayload?.ai) setAi(refreshedPayload.ai as AiProfile);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setGenerating(false);
    }
  }, [
    draft,
    fallbackMcat,
    fallbackCgpa,
    fallbackResidencyState,
    fallbackMissionTags,
    fallbackSpecialtyInterest,
  ]);

  return (
    <section className="surface rounded-[2rem] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-cyan-300">
            <Sparkles className="h-4 w-4" />
            <p className="text-xs font-semibold uppercase tracking-[0.24em]">AI Fit Profile</p>
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Your profile, scored once by Claude — reused across all 163 schools
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">
            Claude reads your personal statement, activities, stats, and demographics and returns six calibrated dimensional scores plus canonical mission themes. Every school fit score you see in the explorer blends your AI profile with that school&apos;s pre-computed profile deterministically — no per-school LLM calls, consistent scores across refreshes.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={generating || !hasMaterial}
          className="inline-flex items-center gap-2 rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Brain className="h-4 w-4" />}
          {ai ? "Regenerate AI profile" : "Generate AI profile"}
        </button>
      </div>

      {!hasMaterial ? (
        <p className="mt-4 rounded-xl border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200">
          Add at least a personal statement (&gt;120 chars) and MCAT/GPA in onboarding before generating.
        </p>
      ) : null}

      {error ? (
        <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-400/40 bg-rose-400/10 p-3 text-sm text-rose-100">
          <TriangleAlert className="mt-0.5 h-4 w-4" />
          <span>{error}</span>
        </div>
      ) : null}

      {loading && !ai ? <p className="mt-4 text-sm text-slate-400">Loading cached AI profile…</p> : null}

      {ai ? (
        <div className="mt-6 space-y-5">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {DIMENSIONS.map((dim) => {
              const value = ai[dim.key] as number;
              return (
                <div
                  key={dim.key.toString()}
                  className={`rounded-2xl border p-4 ${scoreTone(value)}`}
                >
                  <p className="text-[10px] uppercase tracking-[0.18em] opacity-70">{dim.label}</p>
                  <p className="mt-2 text-3xl font-semibold">{value}</p>
                  <p className="mt-1 text-[11px] leading-4 opacity-70">{dim.hint}</p>
                </div>
              );
            })}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Mission themes (used to match schools)
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {ai.missionThemes.length === 0 ? (
                <span className="text-xs text-slate-500">No themes extracted yet.</span>
              ) : (
                ai.missionThemes
                  .slice()
                  .sort((a, b) => b.weight - a.weight)
                  .map((t) => (
                    <span
                      key={t.theme}
                      className="rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-xs text-cyan-200"
                      title={`Weight ${t.weight.toFixed(2)}`}
                    >
                      {themeLabel(t.theme)} · {(t.weight * 100).toFixed(0)}
                    </span>
                  ))
              )}
            </div>
          </div>

          {ai.archetypes.length > 0 ? (
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                Best-fit archetypes
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {ai.archetypes.map((a) => (
                  <span
                    key={a}
                    className="rounded-full border border-indigo-400/30 bg-indigo-400/10 px-3 py-1 text-xs text-indigo-200"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          ) : null}

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">Strengths</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-200">
                {ai.strengths.map((s) => (
                  <li key={s} className="flex items-start gap-2">
                    <Check className="mt-0.5 h-4 w-4 text-emerald-400" />
                    <span>{s}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-2xl border border-amber-400/20 bg-amber-400/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">Gaps to shore up</p>
              <ul className="mt-2 space-y-1 text-sm text-slate-200">
                {ai.gaps.map((g) => (
                  <li key={g} className="flex items-start gap-2">
                    <TriangleAlert className="mt-0.5 h-4 w-4 text-amber-400" />
                    <span>{g}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {ai.redFlags.length > 0 ? (
            <div className="rounded-2xl border border-rose-400/30 bg-rose-400/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-rose-300">Red flags</p>
              <ul className="mt-2 space-y-1 text-sm text-rose-100">
                {ai.redFlags.map((r) => (
                  <li key={r}>• {r}</li>
                ))}
              </ul>
            </div>
          ) : null}

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-300">Summary</p>
            <p className="mt-2 text-sm leading-6 text-slate-200">{ai.narrativeSummary}</p>
            <p className="mt-3 text-[10px] text-slate-500">
              {ai.model} · {new Date(ai.updatedAt).toLocaleString()}
            </p>
          </div>
        </div>
      ) : null}

      {!ai && !loading && !error ? (
        <p className="mt-4 text-sm text-slate-400">
          No AI profile yet. Click <strong>Generate AI profile</strong> to have Claude analyze your application materials.
        </p>
      ) : null}
    </section>
  );
}
