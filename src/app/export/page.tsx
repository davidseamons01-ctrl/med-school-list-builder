import { ExportClient } from "@/components/ExportClient";

export default function ExportPage() {
  return (
    <div className="space-y-6">
      <section className="surface rounded-[2rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Export</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          Take your data back out in structured form.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          Export your applicant profile, saved school list, notes, score breakdowns, and checklist fields so you can
          keep working in a spreadsheet or archive the current state of your research.
        </p>
      </section>
      <section className="surface rounded-[2rem] p-8">
        <ExportClient />
      </section>
    </div>
  );
}

