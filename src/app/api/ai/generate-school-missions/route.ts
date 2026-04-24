import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import {
  generateSchoolAiMission,
  SCHOOL_MISSION_PROMPT_VERSION,
  type GenerateSchoolInput,
} from "@/lib/ai/school-mission";

export const runtime = "nodejs";
export const maxDuration = 300;

const requestSchema = z.object({
  slug: z.string().optional(),
  limit: z.number().int().positive().max(200).optional(),
  onlyMissing: z.boolean().default(true),
});

function authorized(req: Request): boolean {
  if (!process.env.CRON_SECRET) return true;
  const header = req.headers.get("authorization") ?? "";
  return header === `Bearer ${process.env.CRON_SECRET}`;
}

async function buildInput(slug: string): Promise<{
  schoolId: string;
  input: GenerateSchoolInput;
} | null> {
  const school = await prisma.school.findUnique({
    where: { slug },
    include: {
      financialProfile: true,
      clinicalAffiliations: true,
      neighborhoodSafeties: { take: 4, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!school) return null;
  const grades = school.neighborhoodSafeties
    .map((n) => n.safetyGrade)
    .filter((g): g is string => Boolean(g));
  return {
    schoolId: school.id,
    input: {
      name: school.name,
      city: school.city,
      state: school.state,
      control: school.control,
      missionTagNotes: school.missionTagNotes,
      residencyBiasNotes: school.residencyBiasNotes,
      oosFriendly: school.oosFriendly,
      oosMatriculantPct: school.oosMatriculantPct,
      medianMcat: school.financialProfile?.medianMcat ?? null,
      tuitionResident: school.financialProfile?.tuitionResident ?? null,
      tuitionNonResident: school.financialProfile?.tuitionNonResident ?? null,
      neighborhoodGrades: grades,
      hasLevel1Trauma: school.clinicalAffiliations.some((c) => c.isLevel1Trauma),
      hasSafetyNet: school.clinicalAffiliations.some((c) => c.isSafetyNet),
      hasVA: school.clinicalAffiliations.some((c) => c.isVA),
    },
  };
}

async function ensureMissionFor(
  schoolId: string,
  input: GenerateSchoolInput,
): Promise<{ ok: true; generated: boolean; cached: boolean } | { ok: false; error: string }> {
  try {
    const generated = await generateSchoolAiMission(input);
    await prisma.schoolAiMissionProfile.upsert({
      where: { schoolId },
      create: {
        schoolId,
        themesJson: JSON.stringify(generated.data.themes),
        archetypesJson: JSON.stringify(generated.data.archetypes),
        focusSummary: generated.data.focusSummary,
        selectivityTier: generated.data.selectivityTier,
        researchIntensity: Math.round(generated.data.researchIntensity),
        serviceIntensity: Math.round(generated.data.serviceIntensity),
        ruralOrientation: Math.round(generated.data.ruralOrientation),
        urbanUnderservedOrientation: Math.round(generated.data.urbanUnderservedOrientation),
        model: generated.model,
        promptVersion: generated.promptVersion,
        sourceFingerprint: generated.sourceFingerprint,
        rawResponseJson: generated.rawResponse,
      },
      update: {
        themesJson: JSON.stringify(generated.data.themes),
        archetypesJson: JSON.stringify(generated.data.archetypes),
        focusSummary: generated.data.focusSummary,
        selectivityTier: generated.data.selectivityTier,
        researchIntensity: Math.round(generated.data.researchIntensity),
        serviceIntensity: Math.round(generated.data.serviceIntensity),
        ruralOrientation: Math.round(generated.data.ruralOrientation),
        urbanUnderservedOrientation: Math.round(generated.data.urbanUnderservedOrientation),
        model: generated.model,
        promptVersion: generated.promptVersion,
        sourceFingerprint: generated.sourceFingerprint,
        rawResponseJson: generated.rawResponse,
      },
    });
    return { ok: true, generated: true, cached: false };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "generation failed" };
  }
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      { error: "missing_anthropic_api_key" },
      { status: 500 },
    );
  }

  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body ?? {});
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  const { slug, limit, onlyMissing } = parsed.data;

  if (slug) {
    const built = await buildInput(slug);
    if (!built) return NextResponse.json({ error: "school_not_found" }, { status: 404 });
    const result = await ensureMissionFor(built.schoolId, built.input);
    return NextResponse.json(result);
  }

  const candidates = await prisma.school.findMany({
    where: onlyMissing
      ? {
          OR: [
            { aiMissionProfile: null },
            { aiMissionProfile: { promptVersion: { not: SCHOOL_MISSION_PROMPT_VERSION } } },
          ],
        }
      : {},
    select: { slug: true, name: true },
    orderBy: [{ state: "asc" }, { name: "asc" }],
    take: limit ?? 200,
  });

  const results: Array<{ slug: string; ok: boolean; error?: string }> = [];
  for (const c of candidates) {
    const built = await buildInput(c.slug);
    if (!built) {
      results.push({ slug: c.slug, ok: false, error: "school_vanished" });
      continue;
    }
    const result = await ensureMissionFor(built.schoolId, built.input);
    if (result.ok) {
      results.push({ slug: c.slug, ok: true });
    } else {
      results.push({ slug: c.slug, ok: false, error: result.error });
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  return NextResponse.json({
    ok: true,
    processed: results.length,
    successes: results.filter((r) => r.ok).length,
    failures: results.filter((r) => !r.ok),
  });
}

export async function GET() {
  const stats = await prisma.schoolAiMissionProfile.aggregate({
    _count: true,
  });
  const totalSchools = await prisma.school.count();
  const missingCount = totalSchools - (stats._count ?? 0);
  return NextResponse.json({
    totalSchools,
    profiledSchools: stats._count,
    missingCount,
  });
}
