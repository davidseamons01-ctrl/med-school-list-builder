/**
 * Phase A ingestion: populate the three columns that the explorer table
 * depends on (Median MCAT, 3-Year MD, True COL) with real, sourced data for
 * every MD school currently seeded.
 *
 * What this script writes:
 *  - SchoolFinancialProfile.medianMcat / medianCgpa (from curated class
 *    profile medians)
 *  - School.has3YearPathway + SchoolStrategyProfile.hasThreeYearMdPathway
 *    (from curated accelerated-pathway list; all others set to false)
 *  - SchoolCostOfLivingProfile.hudTwoBedroomFairMarketRent (HUD FY2025, live
 *    where ZIP/FIPS are known, state-level fallback otherwise)
 *
 * Run with:  npx tsx scripts/ingest-phase-a.ts
 */

import { PrismaClient } from "@prisma/client";
import { findClassProfileMedian } from "./data/md-class-profile-medians";
import { findThreeYearProgram } from "./data/three-year-md-programs";
import { fetchHudTwoBedroomFairMarketRent } from "../src/lib/api/hud-fmr";

const prisma = new PrismaClient();

type Counters = {
  total: number;
  mcatGpaUpdated: number;
  mcatGpaMissing: number;
  threeYearSet: number;
  threeYearNone: number;
  fmrLive: number;
  fmrFallback: number;
  fmrNull: number;
};

async function run() {
  const counters: Counters = {
    total: 0,
    mcatGpaUpdated: 0,
    mcatGpaMissing: 0,
    threeYearSet: 0,
    threeYearNone: 0,
    fmrLive: 0,
    fmrFallback: 0,
    fmrNull: 0,
  };

  const schools = await prisma.school.findMany({
    select: {
      id: true,
      name: true,
      slug: true,
      state: true,
      zip: true,
      countyFips: true,
    },
    orderBy: { name: "asc" },
  });
  counters.total = schools.length;

  for (const school of schools) {
    // Medians
    const median = findClassProfileMedian(school.name);
    if (median && (median.medianMcat != null || median.medianCgpa != null)) {
      await prisma.schoolFinancialProfile.upsert({
        where: { schoolId: school.id },
        create: {
          schoolId: school.id,
          medianMcat: median.medianMcat ?? undefined,
          medianCgpa: median.medianCgpa ?? undefined,
          sourceLabel: "School class profile (curated)",
          sourceUrl: median.sourceUrl,
          sourceEffectiveYear: 2024,
        },
        update: {
          medianMcat: median.medianMcat ?? undefined,
          medianCgpa: median.medianCgpa ?? undefined,
          sourceLabel: "School class profile (curated)",
          sourceUrl: median.sourceUrl,
          sourceEffectiveYear: 2024,
        },
      });
      counters.mcatGpaUpdated += 1;
    } else {
      counters.mcatGpaMissing += 1;
    }

    // 3-year MD pathway
    const threeYear = findThreeYearProgram(school.name);
    const hasThreeYear = threeYear != null;
    await prisma.school.update({
      where: { id: school.id },
      data: { has3YearPathway: hasThreeYear },
    });
    await prisma.schoolStrategyProfile.upsert({
      where: { schoolId: school.id },
      create: {
        schoolId: school.id,
        hasThreeYearMdPathway: hasThreeYear,
        strategyNotes: threeYear?.trackLabel ?? null,
        sourceLabel: threeYear ? "Consortium of Accelerated Medical Pathway Programs" : "Curated MD pathway audit",
        sourceUrl: threeYear?.sourceUrl,
      },
      update: {
        hasThreeYearMdPathway: hasThreeYear,
        strategyNotes: threeYear?.trackLabel ?? null,
        sourceLabel: threeYear ? "Consortium of Accelerated Medical Pathway Programs" : "Curated MD pathway audit",
        sourceUrl: threeYear?.sourceUrl,
      },
    });
    if (hasThreeYear) counters.threeYearSet += 1;
    else counters.threeYearNone += 1;

    // HUD 2BR FMR (live when ZIP/FIPS known, state fallback otherwise)
    const fmr = await fetchHudTwoBedroomFairMarketRent({
      zipCode: school.zip ?? undefined,
      countyFips: school.countyFips ?? undefined,
      state: school.state ?? undefined,
    });
    if (fmr.fairMarketRentMonthly != null) {
      if (fmr.isFallback) counters.fmrFallback += 1;
      else counters.fmrLive += 1;
    } else {
      counters.fmrNull += 1;
    }
    await prisma.schoolCostOfLivingProfile.upsert({
      where: { schoolId: school.id },
      create: {
        schoolId: school.id,
        hudTwoBedroomFairMarketRent: fmr.fairMarketRentMonthly ?? undefined,
        zipCodeUsed: school.zip ?? undefined,
        countyFipsUsed: school.countyFips ?? undefined,
        sourceLabel: fmr.sourceLabel,
        sourceUrl: fmr.sourceUrl,
        sourceRetrievedAt: new Date(),
      },
      update: {
        hudTwoBedroomFairMarketRent: fmr.fairMarketRentMonthly ?? undefined,
        zipCodeUsed: school.zip ?? undefined,
        countyFipsUsed: school.countyFips ?? undefined,
        sourceLabel: fmr.sourceLabel,
        sourceUrl: fmr.sourceUrl,
        sourceRetrievedAt: new Date(),
      },
    });
  }

  console.log("Phase A ingestion complete");
  console.table(counters);
}

run()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
