import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseFactValue } from "@/lib/scoring";

type ParsedFinancialRow = {
  schoolSlug: string;
  averageGraduateDebt?: number | null;
  pctReceivingInstitutionalGrants?: number | null;
  medianMcat?: number | null;
  medianCgpa?: number | null;
  tuitionResident?: number | null;
  tuitionNonResident?: number | null;
  sourceLabel?: string;
  sourceUrl?: string;
  sourceEffectiveYear?: number;
};

function numberOrNull(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

async function parseAamcTuitionCsvs(): Promise<ParsedFinancialRow[]> {
  // TODO: Implement CSV parsing for the AAMC tuition/financial files once the final input format is fixed.
  // This returns an empty array so the cron still runs and can fall back to existing SchoolFact records.
  return [];
}

function cronUnauthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization");
  return auth !== `Bearer ${secret}`;
}

export async function GET(req: Request) {
  if (cronUnauthorized(req)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const parsedRows = await parseAamcTuitionCsvs();
  const parsedBySlug = new Map(parsedRows.map((row) => [row.schoolSlug, row]));
  const schools = await prisma.school.findMany({
    include: {
      facts: true,
    },
    orderBy: { slug: "asc" },
  });

  let updated = 0;
  for (const school of schools) {
    const csvRow = parsedBySlug.get(school.slug);
    const fact = (key: string) => school.facts.find((row) => row.key === key);
    const averageGraduateDebt =
      csvRow?.averageGraduateDebt ??
      numberOrNull(parseFactValue(fact("median_grad_debt")));
    const pctReceivingInstitutionalGrants =
      csvRow?.pctReceivingInstitutionalGrants ??
      numberOrNull(parseFactValue(fact("pct_receiving_aid")));
    const medianMcat =
      csvRow?.medianMcat ?? numberOrNull(parseFactValue(fact("median_mcat")));
    const medianCgpa =
      csvRow?.medianCgpa ?? numberOrNull(parseFactValue(fact("median_cgpa")));
    const tuitionResident =
      csvRow?.tuitionResident ??
      numberOrNull(parseFactValue(fact("aamc_2025_2026_total_resident")));
    const tuitionNonResident =
      csvRow?.tuitionNonResident ??
      numberOrNull(parseFactValue(fact("aamc_2025_2026_total_nonresident")));

    await prisma.schoolFinancialProfile.upsert({
      where: { schoolId: school.id },
      create: {
        schoolId: school.id,
        averageGraduateDebt,
        pctReceivingInstitutionalGrants,
        medianMcat,
        medianCgpa,
        tuitionResident,
        tuitionNonResident,
        sourceLabel: csvRow?.sourceLabel ?? "AAMC tuition CSV cron import",
        sourceUrl:
          csvRow?.sourceUrl ??
          "https://www.aamc.org/data-reports/reporting-tools/report/tuition-and-student-fees-reports",
        sourceEffectiveYear: csvRow?.sourceEffectiveYear,
      },
      update: {
        averageGraduateDebt,
        pctReceivingInstitutionalGrants,
        medianMcat,
        medianCgpa,
        tuitionResident,
        tuitionNonResident,
        sourceLabel: csvRow?.sourceLabel ?? "AAMC tuition CSV cron import",
        sourceUrl:
          csvRow?.sourceUrl ??
          "https://www.aamc.org/data-reports/reporting-tools/report/tuition-and-student-fees-reports",
        sourceEffectiveYear: csvRow?.sourceEffectiveYear,
      },
    });
    updated += 1;
  }

  return NextResponse.json({
    ok: true,
    parsedRows: parsedRows.length,
    schoolsUpdated: updated,
    ranAt: new Date().toISOString(),
  });
}

