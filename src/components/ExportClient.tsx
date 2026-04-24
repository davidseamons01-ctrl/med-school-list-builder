"use client";

import { exportBundleAction } from "@/app/actions";

export function ExportClient() {
  async function download(kind: "json" | "csv") {
    const json = await exportBundleAction();
    if (kind === "json") {
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `med-school-list-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    const payload = JSON.parse(json) as {
      schools: Array<Record<string, string | number | null>>;
    };
    const headers = [
      "name",
      "slug",
      "city",
      "state",
      "tier",
      "applyStatus",
      "compositeScore",
      "notes",
      "checklistJson",
    ];
    const lines = payload.schools.map((school) =>
      headers
        .map((header) => {
          const value = school[header];
          const cell = value == null ? "" : String(value);
          return `"${cell.replaceAll('"', '""')}"`;
        })
        .join(","),
    );
    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `med-school-list-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-wrap gap-3">
      <button
        type="button"
        onClick={() => void download("json")}
        className="rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-300"
      >
        Download JSON
      </button>
      <button
        type="button"
        onClick={() => void download("csv")}
        className="rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-200 hover:border-white/20 hover:bg-white/5"
      >
        Download CSV
      </button>
    </div>
  );
}

