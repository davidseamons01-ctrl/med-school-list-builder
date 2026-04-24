import { getListEntriesAction } from "@/app/actions";
import { CycleTrackerBoard } from "@/components/tracker/CycleTrackerBoard";

export default async function TrackerPage() {
  const { entries } = await getListEntriesAction();

  const rows = entries.map((entry) => ({
    entryId: entry.id,
    schoolId: entry.schoolId,
    schoolSlug: entry.school.slug,
    schoolName: entry.school.name,
    schoolCity: entry.school.city,
    schoolState: entry.school.state,
    applyStatus: entry.applyStatus,
    secondaryFee: entry.school.secondaryFee ?? null,
  }));

  return (
    <div className="space-y-6">
      <section className="surface rounded-[2rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Tracker</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Application Cycle Kanban</h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          Drag schools between considering, primary, secondary, and interview stages while tracking your estimated
          cycle costs in real time.
        </p>
      </section>

      <CycleTrackerBoard initialRows={rows} />
    </div>
  );
}
