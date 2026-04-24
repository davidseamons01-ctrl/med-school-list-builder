"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format";

type Props = {
  tuitionAnnual: number | null;
  avgAidAnnual: number | null;
  rent2BedMonthly: number | null;
};

export function RealCostCalculator({
  tuitionAnnual,
  avgAidAnnual,
  rent2BedMonthly,
}: Props) {
  const [aidOverride, setAidOverride] = useState<number | null>(avgAidAnnual);

  const annualBurden = useMemo(() => {
    const tuition = tuitionAnnual ?? 0;
    const aid = aidOverride ?? 0;
    const rentAnnual = (rent2BedMonthly ?? 0) * 12;
    return Math.max(0, tuition - aid + rentAnnual);
  }, [aidOverride, rent2BedMonthly, tuitionAnnual]);

  return (
    <section className="surface rounded-[1.6rem] p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
        Real Cost Widget
      </h3>
      <p className="mt-2 text-sm text-slate-400">
        True Annual Burden = Tuition - Institutional Aid + (Rent2Bed x 12).
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <label className="text-sm text-slate-300">
          Tuition (Annual)
          <input
            type="number"
            value={tuitionAnnual ?? 0}
            readOnly
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm text-slate-300">
          Institutional Aid (Annual)
          <input
            type="number"
            value={aidOverride ?? 0}
            onChange={(e) => setAidOverride(Number(e.target.value))}
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white"
          />
        </label>
        <label className="text-sm text-slate-300">
          Rent2Bed (Monthly)
          <input
            type="number"
            value={rent2BedMonthly ?? 0}
            readOnly
            className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-white"
          />
        </label>
      </div>
      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">True Annual Burden</p>
        <p className="mt-2 text-2xl font-semibold text-white">{formatCurrency(annualBurden)}</p>
      </div>
    </section>
  );
}

