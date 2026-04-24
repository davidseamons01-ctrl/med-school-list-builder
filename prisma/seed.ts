import { PrismaClient } from "@prisma/client";
import { seedSchools } from "../scripts/seed-schools";

const prisma = new PrismaClient();

async function main() {
  const rootDir = process.cwd();

  await prisma.schoolFact.deleteMany();
  await prisma.schoolResource.deleteMany();
  await prisma.schoolListEntry.deleteMany();
  await prisma.schoolList.deleteMany();
  await prisma.school.deleteMany();
  await prisma.applicantProfile.deleteMany();

  await seedSchools(prisma, rootDir);

  const defaultStats = {
    cgpa: 3.97,
    sgpa: 4.0,
    mcat: 522,
    residencyState: "ID",
    programType: "MD",
    specialtyInterest: "competitive_specialties",
  };

  const defaultPrefs = {
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

  const defaultWeights = {
    stats: 0.23,
    mission: 0.2,
    colFamily: 0.27,
    geography: 0.12,
    research: 0.18,
  };

  const defaultWars = {
    clinicalHours: 1200,
    researchHours: 1800,
    volunteeringHours: 600,
    leadershipFlag: true,
  };

  const profile = await prisma.applicantProfile.create({
    data: {
      displayName: "Applicant",
      statsJson: JSON.stringify(defaultStats),
      prefsJson: JSON.stringify(defaultPrefs),
      weightsJson: JSON.stringify(defaultWeights),
      warsJson: JSON.stringify(defaultWars),
    },
  });

  await prisma.schoolList.create({
    data: {
      name: "Primary list",
      profileId: profile.id,
    },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
