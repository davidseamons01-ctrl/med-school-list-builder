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

async function getUserContext() {
  const session = await getServerSession(authOptions);
  const sessionUserId = session?.user?.id;
  if (!sessionUserId) return null;

  const profile = await prisma.applicantProfile.findFirst({
    where: { userId: sessionUserId },
    orderBy: { createdAt: "asc" },
  });
  if (!profile) return null;
  const list = await prisma.schoolList.findFirst({
    where: { profileId: profile.id },
    orderBy: { createdAt: "asc" },
  });
  if (!list) return null;
  return { profile, list };
}

export async function POST() {
  const context = await getUserContext();
  if (!context) {
    return NextResponse.json(
      {
        topHeavy: false,
        reason: "Sign in to generate optimization suggestions.",
        dropReach: [],
        addTarget: [],
      },
      { status: 401 },
    );
  }

  const { profile, list } = context;
  const stats = parseJson<ProfileStats>(profile.statsJson, DEFAULT_STATS);
  const prefs = parseJson<ProfilePrefs>(profile.prefsJson, DEFAULT_PREFS);
  const weights = parseJson<ProfileWeights>(profile.weightsJson, DEFAULT_WEIGHTS);
  const wars = parseJson<WarsInputs>(profile.warsJson, DEFAULT_WARS);

  const entries = await prisma.schoolListEntry.findMany({
    where: { listId: list.id },
    include: { school: { include: { facts: true } } },
  });

  const reachEntries = entries.filter((entry) => entry.tier === "REACH");
  const total = entries.length;
  const reachShare = total > 0 ? reachEntries.length / total : 0;
  const topHeavy = total >= 8 && reachShare >= 0.45;
  const reason = topHeavy
    ? `List is top-heavy: ${reachEntries.length} reach schools out of ${total} total.`
    : `List is balanced: ${reachEntries.length} reach schools out of ${total} total.`;

  if (!topHeavy) {
    return NextResponse.json({ topHeavy, reason, dropReach: [], addTarget: [] });
  }

  const dropReach = [...reachEntries]
    .sort((a, b) => (a.compositeScore ?? 0) - (b.compositeScore ?? 0))
    .slice(0, 3)
    .map((entry) => ({
      schoolId: entry.schoolId,
      name: entry.school.name,
      compositeScore: entry.compositeScore ?? 0,
    }));

  const existingSchoolIds = new Set(entries.map((entry) => entry.schoolId));
  const candidateSchools = await prisma.school.findMany({
    where: { id: { notIn: [...existingSchoolIds] } },
    include: { facts: true },
    take: 140,
  });

  const addTarget = candidateSchools
    .map((school) => {
      const { composite, statTier } = computeFitScore({
        stats,
        prefs,
        weights,
        wars,
        school: {
          state: school.state,
          control: school.control,
          missionTagNotes: school.missionTagNotes,
          facts: school.facts,
        },
      });
      return { school, composite, statTier };
    })
    .filter((candidate) => candidate.statTier === "TARGET")
    .sort((a, b) => b.composite - a.composite)
    .slice(0, 3)
    .map((candidate) => ({
      slug: candidate.school.slug,
      name: candidate.school.name,
      state: candidate.school.state,
      compositeScore: candidate.composite,
    }));

  return NextResponse.json({ topHeavy, reason, dropReach, addTarget });
}
