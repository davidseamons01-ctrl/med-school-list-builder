import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import {
  generateSchoolAiMission,
  SCHOOL_MISSION_PROMPT_VERSION,
  type GenerateSchoolInput,
} from "../src/lib/ai/school-mission";

const prisma = new PrismaClient();

async function run() {
  if (!process.env.ANTHROPIC_API_KEY) {
    console.error("ANTHROPIC_API_KEY is not set");
    process.exit(1);
  }

  const onlyMissing = process.env.ONLY_MISSING !== "false";
  const limit = Number(process.env.LIMIT ?? "200");
  const slug = process.env.SLUG ?? null;

  const schools = await prisma.school.findMany({
    where: slug
      ? { slug }
      : onlyMissing
        ? {
            OR: [
              { aiMissionProfile: null },
              {
                aiMissionProfile: {
                  promptVersion: { not: SCHOOL_MISSION_PROMPT_VERSION },
                },
              },
            ],
          }
        : {},
    include: {
      financialProfile: true,
      clinicalAffiliations: true,
      neighborhoodSafeties: { take: 4, orderBy: { updatedAt: "desc" } },
    },
    orderBy: [{ state: "asc" }, { name: "asc" }],
    take: limit,
  });

  console.log(`Scoring ${schools.length} school(s) with Claude…`);
  let ok = 0;
  let fail = 0;

  for (let i = 0; i < schools.length; i += 1) {
    const school = schools[i];
    const grades = school.neighborhoodSafeties
      .map((n) => n.safetyGrade)
      .filter((g): g is string => Boolean(g));
    const input: GenerateSchoolInput = {
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
    };

    try {
      const generated = await generateSchoolAiMission(input);
      await prisma.schoolAiMissionProfile.upsert({
        where: { schoolId: school.id },
        create: {
          schoolId: school.id,
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
      ok += 1;
      console.log(
        `  [${i + 1}/${schools.length}] OK ${school.name} (${generated.data.selectivityTier}) themes=${generated.data.themes
          .map((t) => `${t.theme}:${t.weight.toFixed(2)}`)
          .join(", ")}`,
      );
    } catch (err) {
      fail += 1;
      const message = err instanceof Error ? err.message : "unknown";
      console.error(`  [${i + 1}/${schools.length}] FAIL ${school.name} — ${message}`);
    }

    await new Promise((resolve) => setTimeout(resolve, 250));
  }

  console.log(`Done. ${ok} success, ${fail} failed.`);
  await prisma.$disconnect();
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
