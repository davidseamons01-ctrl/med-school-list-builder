import Link from "next/link";
import { getListEntriesAction, recomputeListScoresAction } from "../actions";
import { KanbanBoard } from "@/components/compare/KanbanBoard";

function parseFactNumber(raw: string): number | null {
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === "number" && Number.isFinite(parsed)) return parsed;
    if (typeof parsed === "string") {
      const n = Number(parsed);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  } catch {
    return null;
  }
}

export default async function ComparePage() {
  const { entries } = await getListEntriesAction();
  const rows = entries.map((entry) => {
    const primaryFact = entry.school.facts.find((fact) => fact.key === "primary_application_fee");
    const secondaryFact = entry.school.facts.find((fact) => fact.key === "secondary_application_fee");
    const primaryFee = parseFactNumber(primaryFact?.valueJson ?? "") ?? 175;
    const secondaryFee = parseFactNumber(secondaryFact?.valueJson ?? "") ?? 115;
    let holisticFitScore: number | null = null;
    try {
      const parsed = JSON.parse(entry.scoreBreakdownJson ?? "{}") as { holisticFitScore?: number };
      holisticFitScore = parsed.holisticFitScore ?? null;
    } catch {
      holisticFitScore = null;
    }
    return {
      id: entry.id,
      schoolId: entry.schoolId,
      schoolSlug: entry.school.slug,
      name: entry.school.name,
      city: entry.school.city,
      state: entry.school.state,
      tier: entry.tier,
      applyStatus: entry.applyStatus,
      compositeScore: entry.compositeScore ?? 0,
      holisticFitScore,
      notes: entry.notes,
      primaryFee,
      secondaryFee,
    };
  });

  return (
    <div className="space-y-6">
      <section className="surface rounded-[2rem] p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Compare board</p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Organize baseline, target, and reach schools without losing the lived-context details.</h1>
          </div>
          <form
            action={async () => {
              "use server";
              await recomputeListScoresAction();
            }}
          >
            <button className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300">
              Recompute from profile
            </button>
          </form>
        </div>
      </section>

      {entries.length === 0 ? (
        <div className="surface rounded-[2rem] p-8 text-sm text-slate-300">
          No schools saved yet. Start in the <Link href="/schools" className="text-cyan-300">explorer</Link>.
        </div>
      ) : (
        <section className="surface rounded-[2rem] p-4">
          <KanbanBoard initialRows={rows} />
        </section>
      )}
    </div>
  );
}

