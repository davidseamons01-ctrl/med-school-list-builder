"use client";

import { useMemo, useState } from "react";
import { DndContext, PointerSensor, useDraggable, useDroppable, useSensor, useSensors } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import Link from "next/link";
import { updateTrackerApplyStatusAction } from "@/app/actions";
import { formatCurrency } from "@/lib/format";

type ApplyStatus = "CONSIDERING" | "APPLY" | "SECONDARY" | "INTERVIEW";

type TrackerRow = {
  entryId: string;
  schoolId: string;
  schoolSlug: string;
  schoolName: string;
  schoolCity: string;
  schoolState: string;
  applyStatus: string;
  secondaryFee: number | null;
};

const AMCAS_FIRST_SCHOOL_FEE_2025 = 175;
const AMCAS_ADDITIONAL_FEE_2025 = 46;
const FALLBACK_SECONDARY_FEE = 110;

const COLUMNS: Array<{ id: ApplyStatus; title: string }> = [
  { id: "CONSIDERING", title: "Considering" },
  { id: "APPLY", title: "Primary Submitted" },
  { id: "SECONDARY", title: "Secondary Received" },
  { id: "INTERVIEW", title: "Interviewed" },
];

function normalizeStatus(status: string): ApplyStatus {
  if (status === "APPLY" || status === "SECONDARY" || status === "INTERVIEW") return status;
  return "CONSIDERING";
}

function DraggableSchoolCard({ row }: { row: TrackerRow }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: row.entryId,
    data: { rowId: row.entryId },
  });
  return (
    <article
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.5 : 1,
      }}
      className="rounded-xl border border-white/10 bg-slate-950/70 p-3"
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <Link href={`/schools/${row.schoolSlug}`} className="text-sm font-semibold text-white hover:text-cyan-200">
            {row.schoolName}
          </Link>
          <p className="text-xs text-slate-400">
            {row.schoolCity}, {row.schoolState}
          </p>
        </div>
        <button
          type="button"
          className="rounded-md border border-white/15 px-2 py-1 text-[10px] text-slate-300"
          {...listeners}
          {...attributes}
        >
          Drag
        </button>
      </div>
    </article>
  );
}

function TrackerColumn({ id, title, rows }: { id: ApplyStatus; title: string; rows: TrackerRow[] }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      className={`min-h-[340px] rounded-[1.4rem] border p-3 ${
        isOver ? "border-cyan-300/70 bg-cyan-400/10" : "border-white/10 bg-white/5"
      }`}
    >
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-slate-300">{rows.length}</span>
      </div>
      <div className="space-y-2">
        {rows.map((row) => (
          <DraggableSchoolCard key={row.entryId} row={row} />
        ))}
      </div>
    </section>
  );
}

export function CycleTrackerBoard({ initialRows }: { initialRows: TrackerRow[] }) {
  const [rows, setRows] = useState<TrackerRow[]>(initialRows);
  const [pending, setPending] = useState(false);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const grouped = useMemo(
    () =>
      COLUMNS.map((column) => ({
        ...column,
        rows: rows.filter((row) => normalizeStatus(row.applyStatus) === column.id),
      })),
    [rows],
  );

  const financial = useMemo(() => {
    const submittedPrimaryRows = rows.filter((row) => {
      const status = normalizeStatus(row.applyStatus);
      return status === "APPLY" || status === "SECONDARY" || status === "INTERVIEW";
    });
    const secondaryRows = rows.filter((row) => {
      const status = normalizeStatus(row.applyStatus);
      return status === "SECONDARY" || status === "INTERVIEW";
    });
    const primaryCount = submittedPrimaryRows.length;
    const secondaryCount = secondaryRows.length;
    const primaryCost =
      primaryCount > 0
        ? AMCAS_FIRST_SCHOOL_FEE_2025 + (primaryCount - 1) * AMCAS_ADDITIONAL_FEE_2025
        : 0;
    const secondaryCost = secondaryRows.reduce(
      (sum, row) => sum + (row.secondaryFee ?? FALLBACK_SECONDARY_FEE),
      0,
    );
    const missingFeeCount = secondaryRows.filter((row) => row.secondaryFee == null).length;
    return {
      primaryCount,
      secondaryCount,
      primaryCost,
      secondaryCost,
      total: primaryCost + secondaryCost,
      missingFeeCount,
    };
  }, [rows]);

  async function persistDrop(rowId: string, status: ApplyStatus) {
    const row = rows.find((item) => item.entryId === rowId);
    if (!row) return;
    if (normalizeStatus(row.applyStatus) === status) return;
    setRows((prev) => prev.map((item) => (item.entryId === rowId ? { ...item, applyStatus: status } : item)));
    setPending(true);
    try {
      await updateTrackerApplyStatusAction({
        schoolId: row.schoolId,
        applyStatus: status,
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="surface rounded-[1.6rem] p-5">
        <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">Financial Cycle Planner</h3>
        <div className="mt-3 grid gap-3 md:grid-cols-5">
          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
            <p className="text-xs text-slate-400">Primary Count</p>
            <p className="mt-1 text-lg font-semibold text-white">{financial.primaryCount}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
            <p className="text-xs text-slate-400">Secondary Count</p>
            <p className="mt-1 text-lg font-semibold text-white">{financial.secondaryCount}</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
            <p className="text-xs text-slate-400">AMCAS Primary Cost</p>
            <p className="mt-1 text-lg font-semibold text-white">{formatCurrency(financial.primaryCost)}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">$175 first + $46 each add&apos;l (2025)</p>
          </div>
          <div className="rounded-xl border border-white/10 bg-slate-950/50 p-3">
            <p className="text-xs text-slate-400">Secondary Fees</p>
            <p className="mt-1 text-lg font-semibold text-white">{formatCurrency(financial.secondaryCost)}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">
              Per-school fee (e.g., NYU $0, Emory $150)
              {financial.missingFeeCount > 0
                ? ` · ${financial.missingFeeCount} at $${FALLBACK_SECONDARY_FEE} default`
                : ""}
            </p>
          </div>
          <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 p-3">
            <p className="text-xs uppercase tracking-[0.14em] text-cyan-200">Estimated Total</p>
            <p className="mt-1 text-xl font-semibold text-white">{formatCurrency(financial.total)}</p>
          </div>
        </div>
        {pending ? <p className="mt-2 text-xs text-slate-400">Saving drag update...</p> : null}
      </section>

      <DndContext
        sensors={sensors}
        onDragEnd={(event) => {
          const rowId = String(event.active.id);
          const target = event.over?.id ? String(event.over.id) : null;
          if (!target) return;
          if (!COLUMNS.some((column) => column.id === target)) return;
          void persistDrop(rowId, target as ApplyStatus);
        }}
      >
        <div className="grid gap-3 lg:grid-cols-4">
          {grouped.map((column) => (
            <TrackerColumn key={column.id} id={column.id} title={column.title} rows={column.rows} />
          ))}
        </div>
      </DndContext>
    </div>
  );
}
