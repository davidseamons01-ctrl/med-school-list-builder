/**
 * Phase C ingestion: OOS friendliness, family-friendliness, and per-school
 * secondary fees. Populates the three new School columns added in the
 * Phase C schema migration so the explorer chips, financial planner, and
 * holistic fit scoring can all key off real data.
 *
 * Run with:  npx tsx scripts/ingest-phase-c.ts
 */

import { PrismaClient } from "@prisma/client";
import { computeOosProfile } from "./data/oos-friendly";
import { findFamilyFriendly } from "./data/family-friendly";
import { findSecondaryFee } from "./data/secondary-fees";

const prisma = new PrismaClient();

async function run() {
  const schools = await prisma.school.findMany({
    select: { id: true, name: true, slug: true, control: true, state: true },
    orderBy: { name: "asc" },
  });

  let oosFriendlyCount = 0;
  let familyFriendlyCount = 0;
  let nonZeroFees = 0;
  let freeSecondaries = 0;

  for (const school of schools) {
    const { oosFriendly, oosMatriculantPct } = computeOosProfile({
      name: school.name,
      control: school.control,
    });
    const family = findFamilyFriendly(school.name);
    const secondaryFee = findSecondaryFee(school.name);

    if (oosFriendly) oosFriendlyCount += 1;
    if (family) familyFriendlyCount += 1;
    if (secondaryFee > 0) nonZeroFees += 1;
    else freeSecondaries += 1;

    await prisma.school.update({
      where: { id: school.id },
      data: {
        oosFriendly,
        oosMatriculantPct,
        familyFriendly: Boolean(family),
        familyProgramNotes: family?.notes ?? null,
        secondaryFee,
      },
    });
  }

  console.log("Phase C ingestion complete");
  console.table({
    total: schools.length,
    oosFriendlyCount,
    familyFriendlyCount,
    nonZeroFees,
    freeSecondaries,
  });
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
