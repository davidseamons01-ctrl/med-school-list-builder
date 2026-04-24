import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { computeFitScore } from "@/lib/scoring";
import type { ProfilePrefs, ProfileStats, ProfileWeights, WarsInputs } from "@/lib/types";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

const DEFAULT_STATS: ProfileStats = {
  cgpa: 3.97,
  sgpa: 4.0,
  mcat: 522,
  residencyState: "ID",
  programType: "MD",
  specialtyInterest: "competitive_specialties",
};

const DEFAULT_PREFS: ProfilePrefs = {
  missionTags: ["rural_health", "health_equity", "research_intensive"],
  avoidStates: [],
  preferStates: [],
  familyPriority: 5,
  coaSensitivity: 4,
  prestigeResearchWeight: 4,
  monthlyHousingBudget: 1800,
  monthlyAreaRealityBudget: 3000,
  householdAdults: 2,
  householdChildren: 1,
  wantsArcGisExplorer: true,
};

const DEFAULT_WEIGHTS: ProfileWeights = {
  stats: 0.23,
  mission: 0.2,
  colFamily: 0.27,
  geography: 0.12,
  research: 0.18,
};

const DEFAULT_WARS: WarsInputs = {
  clinicalHours: 1200,
  researchHours: 1800,
  volunteeringHours: 600,
  leadershipFlag: true,
};

function parseJson<T>(raw: string, fallback: T): T {
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

async function getPrimaryContext() {
  const session = await getServerSession(authOptions);
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) {
    return null;
  }
  const profile =
    (await prisma.applicantProfile.findFirst({
      where: { userId: sessionUserId },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.applicantProfile.create({
      data: {
        userId: sessionUserId,
        displayName: "Applicant",
        statsJson: JSON.stringify(DEFAULT_STATS),
        prefsJson: JSON.stringify(DEFAULT_PREFS),
        weightsJson: JSON.stringify(DEFAULT_WEIGHTS),
        warsJson: JSON.stringify(DEFAULT_WARS),
      },
    }));
  const list =
    (await prisma.schoolList.findFirst({
      where: { profileId: profile.id },
      orderBy: { createdAt: "asc" },
    })) ??
    (await prisma.schoolList.create({
      data: { name: "Primary list", profileId: profile.id },
    }));
  return { profile, list };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { slug?: string; applyStatus?: string }
    | null;
  if (!body?.slug || !body?.applyStatus) {
    return NextResponse.json({ ok: false, error: "invalid_payload" }, { status: 400 });
  }

  const context = await getPrimaryContext();
  if (!context) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }
  const { profile, list } = context;
  const school = await prisma.school.findUnique({
    where: { slug: body.slug },
    include: {
      facts: true,
      financialProfile: true,
      costOfLivingProfile: true,
      strategyProfile: true,
      neighborhoodSafeties: { take: 5, orderBy: { updatedAt: "desc" } },
      clinicalAffiliations: { take: 6, orderBy: { updatedAt: "desc" } },
    },
  });
  if (!school) {
    return NextResponse.json({ ok: false, error: "school_not_found" }, { status: 404 });
  }

  const stats = parseJson(profile.statsJson, DEFAULT_STATS);
  const prefs = parseJson(profile.prefsJson, DEFAULT_PREFS);
  const weights = parseJson(profile.weightsJson, DEFAULT_WEIGHTS);
  const wars = parseJson(profile.warsJson, DEFAULT_WARS);
  const fit = computeFitScore({ stats, prefs, weights, wars, school });

  await prisma.schoolListEntry.upsert({
    where: { listId_schoolId: { listId: list.id, schoolId: school.id } },
    create: {
      listId: list.id,
      schoolId: school.id,
      tier: fit.statTier,
      applyStatus: body.applyStatus,
      compositeScore: fit.composite,
      scoreBreakdownJson: JSON.stringify(fit.breakdown),
    },
    update: {
      applyStatus: body.applyStatus,
      compositeScore: fit.composite,
      scoreBreakdownJson: JSON.stringify(fit.breakdown),
    },
  });

  return NextResponse.json({ ok: true });
}

