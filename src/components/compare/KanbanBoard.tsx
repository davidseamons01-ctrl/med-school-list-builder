"use client";

import { useMemo, useState } from "react";
import { DndContext, PointerSensor, closestCorners, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { formatCurrency, formatPercent } from "@/lib/format";

type KanbanStatus = "CONSIDERING" | "APPLY" | "SECONDARY" | "INTERVIEW" | "ACCEPTED";

type Row = {
  id: string;
  schoolId: string;
  schoolSlug: string;
  name: string;
  city: string;
  state: string;
  tier: string;
  applyStatus: string;
  compositeScore: number;
  holisticFitScore: number | null;
  notes: string | null;
  primaryFee: number;
  secondaryFee: number;
};

type Suggestion = {
  topHeavy: boolean;
  reason: string;
  dropReach: Array<{ schoolId: string; name: string; compositeScore: number }>;
  addTarget: Array<{ slug: string; name: string; state: string; compositeScore: number }>;
};

const COLUMNS: Array<{ id: KanbanStatus; label: string }> = [
  { id: "CONSIDERING", label: "Considering" },
  { id: "APPLY", label: "Primary Submitted" },
  { id: "SECONDARY", label: "Secondary Received" },
  { id: "INTERVIEW", label: "Interviewed" },
  { id: "ACCEPTED", label: "Accepted" },
];

function normalizeStatus(status: string): KanbanStatus {
  if (status === "APPLY" || status === "SECONDARY" || status === "INTERVIEW" || status === "ACCEPTED") {
    return status;
  }
  return "CONSIDERING";
}

function DraggableCard(props: { row: Row; onQuickMove: (row: Row, status: KanbanStatus) => void }) {
  const { row, onQuickMove } = props;
  const status = normalizeStatus(row.applyStatus);
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: row.id,
    data: { rowId: row.id, status },
  });
  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.55 : 1,
      }}
      className="rounded-2xl border border-white/10 bg-white/5 p-3"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <Link href={`/schools/${row.schoolSlug}`} className="text-sm font-semibold text-white hover:text-cyan-200">
            {row.name}
          </Link>
          <p className="text-xs text-slate-400">
            {row.city}, {row.state} - {row.tier}
          </p>
        </div>
        <button
          type="button"
          className="rounded-lg border border-white/15 px-2 py-1 text-[11px] text-slate-300 hover:bg-white/5"
          {...listeners}
          {...attributes}
        >
          Drag
        </button>
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300">
        <span>Fit {formatPercent(row.compositeScore)}</span>
        {row.holisticFitScore != null ? <span>Holistic {Math.round(row.holisticFitScore)}</span> : null}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {COLUMNS.filter((col) => col.id !== status).map((col) => (
          <button
            key={`${row.id}-${col.id}`}
            type="button"
            onClick={() => void onQuickMove(row, col.id)}
            className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-300 hover:border-white/30"
          >
            {col.label}
          </button>
        ))}
      </div>
      {row.notes ? <p className="mt-2 line-clamp-2 text-xs text-slate-400">{row.notes}</p> : null}
    </article>
  );
}

function DropColumn(props: {
  id: KanbanStatus;
  label: string;
  rows: Row[];
  onQuickMove: (row: Row, status: KanbanStatus) => void;
}) {
  const { id, label, rows, onQuickMove } = props;
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      className={`min-h-[360px] rounded-[1.5rem] border p-3 ${
        isOver ? "border-cyan-300/60 bg-cyan-500/10" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">{label}</h2>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-300">{rows.length}</span>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <DraggableCard key={row.id} row={row} onQuickMove={onQuickMove} />
        ))}
      </div>
    </section>
  );
}

export function KanbanBoard({ initialRows }: { initialRows: Row[] }) {
  const [rows, setRows] = useState<Row[]>(initialRows);
  const [isSaving, setIsSaving] = useState(false);
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);
  const [optimizeLoading, setOptimizeLoading] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  async function persistStatus(row: Row, status: KanbanStatus) {
    setIsSaving(true);
    try {
      const response = await fetch("/api/cycle/quick-add", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: row.schoolSlug, applyStatus: status }),
      });
      if (!response.ok) throw new Error("Unable to update cycle status.");
      setRows((prev) => prev.map((item) => (item.id === row.id ? { ...item, applyStatus: status } : item)));
    } finally {
      setIsSaving(false);
    }
  }

  async function onAutoOptimize() {
    setOptimizeLoading(true);
    try {
      const response = await fetch("/api/cycle/auto-optimize", { method: "POST" });
      const payload = (await response.json()) as Suggestion;
      setSuggestion(payload);
    } finally {
      setOptimizeLoading(false);
    }
  }

  const totals = useMemo(() => {
    return rows.reduce(
      (acc, row) => {
        const status = normalizeStatus(row.applyStatus);
        if (status === "APPLY" || status === "SECONDARY" || status === "INTERVIEW" || status === "ACCEPTED") {
          acc.primary += row.primaryFee;
        }
        if (status === "SECONDARY" || status === "INTERVIEW" || status === "ACCEPTED") {
          acc.secondary += row.secondaryFee;
        }
        return acc;
      },
      { primary: 0, secondary: 0 },
    );
  }, [rows]);

  const grouped = useMemo(() => {
    return COLUMNS.map((column) => ({
      ...column,
      rows: rows
        .filter((row) => normalizeStatus(row.applyStatus) === column.id)
        .sort((a, b) => b.compositeScore - a.compositeScore),
    }));
  }, [rows]);

  return (
    <div className="space-y-4">
      <div className="grid gap-3 rounded-[1.5rem] border border-white/10 bg-white/5 p-4 md:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Financial cycle planner</p>
          <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(totals.primary + totals.secondary)}</p>
          <p className="text-xs text-slate-400">
            Primary {formatCurrency(totals.primary)} + Secondary {formatCurrency(totals.secondary)}
          </p>
        </div>
        <div className="md:col-span-2 flex flex-wrap items-end justify-end gap-2">
          <button
            type="button"
            onClick={() => void onAutoOptimize()}
            className="rounded-full border border-cyan-300/35 bg-cyan-400/10 px-4 py-2 text-xs font-semibold text-cyan-100 hover:bg-cyan-400/20"
          >
            {optimizeLoading ? "Optimizing..." : "Auto-Optimize List"}
          </button>
          {isSaving ? <span className="text-xs text-slate-400">Saving cycle updates...</span> : null}
        </div>
      </div>

      {suggestion ? (
        <div className="rounded-[1.5rem] border border-white/10 bg-white/5 p-4 text-sm">
          <p className="font-semibold text-white">{suggestion.reason}</p>
          {!suggestion.topHeavy ? (
            <p className="mt-2 text-slate-300">List balance looks healthy right now.</p>
          ) : (
            <div className="mt-3 grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-rose-300">Drop 3 reach schools</p>
                <ul className="mt-2 space-y-1 text-slate-200">
                  {suggestion.dropReach.map((school) => (
                    <li key={school.schoolId}>
                      {school.name} ({formatPercent(school.compositeScore)})
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.2em] text-emerald-300">Add 3 target schools</p>
                <ul className="mt-2 space-y-1 text-slate-200">
                  {suggestion.addTarget.map((school) => (
                    <li key={school.slug}>
                      {school.name} ({school.state})
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragEnd={(event) => {
          const activeRowId = String(event.active.id);
          const overId = event.over?.id ? String(event.over.id) : null;
          if (!overId) return;
          const nextStatus = COLUMNS.find((col) => col.id === overId)?.id;
          if (!nextStatus) return;
          const row = rows.find((item) => item.id === activeRowId);
          if (!row) return;
          if (normalizeStatus(row.applyStatus) === nextStatus) return;
          void persistStatus(row, nextStatus);
        }}
      >
        <div className="grid gap-3 xl:grid-cols-5">
          {grouped.map((column) => (
            <DropColumn key={column.id} id={column.id} label={column.label} rows={column.rows} onQuickMove={persistStatus} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
