import type { PrismaClient } from "@prisma/client";
import * as fs from "fs";
import * as path from "path";
import { createHash } from "crypto";
import XLSX from "xlsx";

type SeedSchool = {
  state: string;
  city: string;
  name: string;
  control: string;
};

type GeocodeRecord = Record<string, { lat: number; lng: number; match?: string } | null>;

type WorkbookFactRow = {
  schoolName: string;
  costType: string;
  residenceStatus: string;
  cost: number;
};

const AAMC_TUITION_SOURCE =
  "https://www.aamc.org/data-reports/reporting-tools/report/tuition-and-student-fees-reports";

const AAMC_TUITION_DOWNLOAD = "https://www.aamc.org/media/8381/download";

const WARS_REFERENCE =
  "https://forums.studentdoctor.net/threads/how-did-wars-work-for-you.1367421/";

function stableSlug(name: string, city: string): string {
  const h = createHash("sha1").update(`${name}|${city}`).digest("hex").slice(0, 8);
  const base = `${name}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 56);
  return `${base}-${h}`;
}

function googleSearchUrl(query: string): string {
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}

function redditSearchUrl(query: string): string {
  return `https://www.reddit.com/search/?q=${encodeURIComponent(query)}`;
}

function youtubeSearchUrl(query: string): string {
  return `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
}

function numbeoCompareUrl(cityState: string): string {
  return `https://www.numbeo.com/cost-of-living/compare_cities.jsp?city1=${encodeURIComponent(
    cityState,
  )}&city2=${encodeURIComponent("Boise, ID")}`;
}

function areaVibesSearchUrl(cityState: string): string {
  return `https://www.areavibes.com/search/?q=${encodeURIComponent(cityState)}`;
}

function nicheSearchUrl(name: string): string {
  return `https://www.niche.com/search/schools/?q=${encodeURIComponent(name)}`;
}

function zillowUrl(zip?: string | null): string {
  if (!zip) return "https://www.zillow.com/homes/for_rent/";
  return `https://www.zillow.com/${zip}-rentals/`;
}

function truliaUrl(city: string, state: string): string {
  return `https://www.trulia.com/for_rent/${encodeURIComponent(city)},${encodeURIComponent(
    state,
  )}/`;
}

function mapsSearchUrl(label: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(label)}`;
}

function normalizeName(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[.,’'()/-]/g, " ")
    .replace(/\b(the|at|of|and|for)\b/g, " ")
    .replace(
      /\b(university|school|college|medicine|medical|health|sciences|science|center|centre|division|biological)\b/g,
      " ",
    )
    .replace(/\s+/g, " ")
    .trim();
}

function factKey(costType: string, residenceStatus: string): { key: string; label: string; unit: string } {
  const residence = residenceStatus.toLowerCase() === "resident" ? "resident" : "nonresident";
  if (costType === "Tuition") {
    return {
      key: `aamc_2025_2026_tuition_${residence}`,
      label: `AAMC 2025-2026 tuition (${residence})`,
      unit: "USD/year",
    };
  }
  if (costType === "Fees") {
    return {
      key: `aamc_2025_2026_fees_${residence}`,
      label: `AAMC 2025-2026 fees (${residence})`,
      unit: "USD/year",
    };
  }
  if (costType === "Health Insurance") {
    return {
      key: `aamc_2025_2026_health_insurance_${residence}`,
      label: `AAMC 2025-2026 health insurance (${residence})`,
      unit: "USD/year",
    };
  }
  return {
    key: `aamc_2025_2026_total_${residence}`,
    label: `AAMC 2025-2026 tuition + fees + health insurance (${residence})`,
    unit: "USD/year",
  };
}

function loadSchools(seedDir: string): SeedSchool[] {
  const tsv = fs.readFileSync(path.join(seedDir, "lcme.tsv"), "utf8");
  return tsv
    .trim()
    .split("\n")
    .slice(1)
    .map((line) => {
      const [state, city, name, control] = line.split("\t");
      return { state, city, name, control };
    });
}

function loadGeocodes(seedDir: string): GeocodeRecord {
  return JSON.parse(fs.readFileSync(path.join(seedDir, "city-geocodes.json"), "utf8")) as GeocodeRecord;
}

function loadAamcTuitionWorkbook(rootDir: string): Map<string, WorkbookFactRow[]> {
  const workbookPath = path.join(rootDir, "data", "raw", "aamc-tuition-2013-2026.xlsx");
  if (!fs.existsSync(workbookPath)) return new Map();
  const workbook = XLSX.readFile(workbookPath);
  const rows = XLSX.utils.sheet_to_json<(string | number)[]>(workbook.Sheets["2025-2026"], {
    header: 1,
    defval: "",
  });
  const result = new Map<string, WorkbookFactRow[]>();
  for (const row of rows.slice(7)) {
    const schoolName = String(row[1] ?? "").trim();
    const costType = String(row[3] ?? "").trim();
    const residenceStatus = String(row[5] ?? "").trim();
    const cost = Number(row[8] ?? NaN);
    if (!schoolName || !costType || !residenceStatus || !Number.isFinite(cost)) continue;
    const key = normalizeName(schoolName);
    const group = result.get(key) ?? [];
    group.push({ schoolName, costType, residenceStatus, cost });
    result.set(key, group);
  }
  return result;
}

function workbookAliases(): Record<string, string> {
  return {
    "Anne Burnett Marion School of Medicine at Texas Christian University":
      "Anne Burnett Marion School of Medicine at TCU",
    "Carle Illinois College of Medicine at the University of Illinois Urbana-Champaign":
      "Carle Illinois College of Medicine",
    "Covenant HealthCare College of Medicine at Central Michigan University":
      "Central Michigan University College of Medicine",
    "LSU Health Sciences Center School of Medicine in New Orleans":
      "Louisiana State University School of Medicine in New Orleans",
    "Penn State College of Medicine": "Pennsylvania State University College of Medicine",
    "Raymond and Ruth Perelman School of Medicine at the University of Pennsylvania":
      "Perelman School of Medicine at the University of Pennsylvania",
    "Texas A&M University School of Medicine":
      "Texas A&M University Naresh K. Vashisht College of Medicine",
    "Paul L. Foster School of Medicine Texas Tech University Health Sciences Center at El Paso":
      "Texas Tech University Health Sciences Center Paul L. Foster School of Medicine",
    "Dell Medical School – University of Texas at Austin":
      "The University of Texas at Austin Dell Medical School",
    "Uniformed Services University of the Health Sciences, F. Edward Hébert School of Medicine":
      "Uniformed Services University of the Health Sciences F. Edward Hebert School of Medicine",
    "University of Arizona College of Medicine - Phoenix": "University of Arizona College of Medicine",
    "University of Arizona College of Medicine - Tucson": "University of Arizona College of Medicine",
    "David Geffen School of Medicine at UCLA":
      "University of California, Los Angeles David Geffen School of Medicine",
    "University of Chicago Pritzker School of Medicine":
      "University of Chicago Division of the Biological Sciences The Pritzker School of Medicine",
    "John A. Burns School of Medicine University of Hawaii at Manoa":
      "University of Hawaii, John A. Burns School of Medicine",
    "University of North Carolina School of Medicine":
      "University of North Carolina at Chapel Hill School of Medicine",
    "Boonshoft School of Medicine Wright State University":
      "Wright State University Boonshoft School of Medicine",
  };
}

function pickWorkbookCost(
  rows: WorkbookFactRow[],
  costType: "Tuition, Fees, and Health Insurance" | "Tuition" | "Fees" | "Health Insurance",
  residenceStatus: "Resident" | "Nonresident",
): number | null {
  const row = rows.find(
    (r) => r.costType === costType && r.residenceStatus === residenceStatus,
  );
  return row ? row.cost : null;
}

function controlValue(raw: string): string {
  if (raw === "public") return "PUBLIC";
  if (raw === "federal") return "FEDERAL";
  return "PRIVATE";
}

function resourceTemplates(school: SeedSchool & { slug: string; zip?: string | null }) {
  const cityState = `${school.city}, ${school.state}`;
  const sharedSchoolQuery = `"${school.name}"`;
  return [
    {
      category: "hard_numbers",
      kind: "official_stats_search",
      provider: "Google Search",
      label: "Official class profile / MCAT / GPA search",
      url: googleSearchUrl(`${sharedSchoolQuery} medical school class profile MCAT GPA debt site:.edu`),
      description: "Search for official school-reported class profile, debt, and admissions numbers.",
    },
    {
      category: "hard_numbers",
      kind: "official_financial_aid_search",
      provider: "Google Search",
      label: "Official financial aid / COA search",
      url: googleSearchUrl(`${sharedSchoolQuery} financial aid cost of attendance site:.edu`),
      description: "School-specific cost of attendance and debt/support pages.",
    },
    {
      category: "hard_numbers",
      kind: "aamc_tuition_report",
      provider: "AAMC",
      label: "AAMC Tuition and Student Fees report",
      url: AAMC_TUITION_SOURCE,
      description: "Public AAMC tuition/fees/health-insurance workbook source.",
    },
    {
      category: "hard_numbers",
      kind: "reddit_sankey_search",
      provider: "Reddit",
      label: "r/premed Sankey search",
      url: redditSearchUrl(`${school.name} sankey r/premed`),
      description: "Search applicant Sankey posts mentioning this school.",
    },
    {
      category: "hard_numbers",
      kind: "wars_reference",
      provider: "Student Doctor Network",
      label: "WARS reference thread",
      url: WARS_REFERENCE,
      description: "WedgeDawg/WARS discussion reference on SDN.",
    },
    {
      category: "cost_of_living",
      kind: "mit_living_wage",
      provider: "MIT Living Wage Calculator",
      label: "MIT Living Wage Calculator",
      url: "https://livingwage.mit.edu/",
      description: "Select county and family size for realistic monthly budgets.",
    },
    {
      category: "cost_of_living",
      kind: "numbeo_compare",
      provider: "Numbeo",
      label: "Numbeo compare to Boise, ID",
      url: numbeoCompareUrl(cityState),
      description: "Crowdsourced cost-of-living comparison baseline.",
    },
    {
      category: "cost_of_living",
      kind: "niche_search",
      provider: "Niche",
      label: "Niche neighborhood/school search",
      url: nicheSearchUrl(`${school.city} ${school.state}`),
      description: "Neighborhood reviews and family-oriented context.",
    },
    {
      category: "cost_of_living",
      kind: "areavibes_search",
      provider: "AreaVibes",
      label: "AreaVibes search",
      url: areaVibesSearchUrl(cityState),
      description: "Crime, amenities, and livability signals.",
    },
    {
      category: "cost_of_living",
      kind: "zillow_rentals",
      provider: "Zillow",
      label: "Zillow rentals",
      url: zillowUrl(school.zip),
      description: "Rental inventory and housing photo reality check.",
    },
    {
      category: "cost_of_living",
      kind: "trulia_rentals",
      provider: "Trulia",
      label: "Trulia rentals",
      url: truliaUrl(school.city, school.state),
      description: "Alternative rental search and neighborhood context.",
    },
    {
      category: "family_support",
      kind: "student_affairs_search",
      provider: "Google Search",
      label: "Student affairs / spouses / family network search",
      url: googleSearchUrl(
        `${sharedSchoolQuery} student affairs spouse partner family network wellness site:.edu`,
      ),
      description: "Search for family support and wellness pages.",
    },
    {
      category: "family_support",
      kind: "city_reddit_family_search",
      provider: "Reddit",
      label: "City Reddit family living search",
      url: redditSearchUrl(`${school.city} moving with family toddlers daycare neighborhoods`),
      description: "Local city subreddit-style search for family logistics.",
    },
    {
      category: "family_support",
      kind: "secondary_prompts_search",
      provider: "Medical School HQ / Search",
      label: "Secondary prompts search",
      url: googleSearchUrl(`${sharedSchoolQuery} medical school secondary prompts medical school hq`),
      description: "Historical secondary prompts and mission themes.",
    },
    {
      category: "vibe_and_facilities",
      kind: "google_maps",
      provider: "Google Maps",
      label: "Campus area in Google Maps",
      url: mapsSearchUrl(`${school.name}, ${cityState}`),
      description: "Street-level feel of the medical school and surrounding area.",
    },
    {
      category: "vibe_and_facilities",
      kind: "reddit_name_fame_search",
      provider: "Reddit",
      label: "Name and fame search",
      url: redditSearchUrl(`${school.name} name and fame r/medicalschool`),
      description: "Search supportive and positive school reviews.",
    },
    {
      category: "vibe_and_facilities",
      kind: "reddit_name_shame_search",
      provider: "Reddit",
      label: "Name and shame search",
      url: redditSearchUrl(`${school.name} name and shame r/medicalschool`),
      description: "Search candid critical reviews and warning signs.",
    },
    {
      category: "vibe_and_facilities",
      kind: "sdn_interview_feedback_search",
      provider: "Student Doctor Network",
      label: "SDN interview feedback search",
      url: googleSearchUrl(`${sharedSchoolQuery} site:studentdoctor.net interview feedback`),
      description: "Interview day notes and facilities impressions.",
    },
    {
      category: "vibe_and_facilities",
      kind: "youtube_day_in_life_search",
      provider: "YouTube",
      label: "Unofficial day-in-the-life search",
      url: youtubeSearchUrl(`day in the life medical student ${school.name} unofficial`),
      description: "Student-made vlogs and environment snapshots.",
    },
  ];
}

export async function seedSchools(prisma: PrismaClient, rootDir: string) {
  const seedDir = path.join(rootDir, "prisma", "seed-data");
  const schools = loadSchools(seedDir);
  const geocodes = loadGeocodes(seedDir);
  const aamcWorkbook = loadAamcTuitionWorkbook(rootDir);
  const aliases = workbookAliases();

  for (const school of schools) {
    const slug = stableSlug(school.name, school.city);
    const geo = geocodes[`${school.city}|${school.state}`];
    const upserted = await prisma.school.upsert({
      where: { slug },
      create: {
        slug,
        name: school.name,
        city: school.city,
        state: school.state,
        control: controlValue(school.control),
        lat: geo?.lat,
        lng: geo?.lng,
        searchAliasesJson: JSON.stringify([school.name]),
        lastVerifiedAt: new Date(),
      },
      update: {
        name: school.name,
        city: school.city,
        state: school.state,
        control: controlValue(school.control),
        lat: geo?.lat,
        lng: geo?.lng,
        lastVerifiedAt: new Date(),
      },
    });

    const workbookName = aliases[school.name] ?? school.name;
    const workbookRows =
      aamcWorkbook.get(normalizeName(workbookName)) ?? aamcWorkbook.get(normalizeName(school.name)) ?? [];

    for (const row of workbookRows) {
      const meta = factKey(row.costType, row.residenceStatus);
      await prisma.schoolFact.upsert({
        where: { schoolId_key: { schoolId: upserted.id, key: meta.key } },
        create: {
          schoolId: upserted.id,
          key: meta.key,
          category: "hard_numbers",
          label: meta.label,
          valueJson: JSON.stringify(row.cost),
          valueType: "currency",
          unit: meta.unit,
          sourceType: "AAMC_PUBLIC",
          sourceLabel: "AAMC Tuition and Student Fees Reports",
          sourceUrl: AAMC_TUITION_DOWNLOAD,
          retrievedAt: new Date("2026-04-23T00:00:00.000Z"),
          isVerified: true,
          isSeeded: true,
        },
        update: {
          category: "hard_numbers",
          label: meta.label,
          valueJson: JSON.stringify(row.cost),
          valueType: "currency",
          unit: meta.unit,
          sourceType: "AAMC_PUBLIC",
          sourceLabel: "AAMC Tuition and Student Fees Reports",
          sourceUrl: AAMC_TUITION_DOWNLOAD,
          retrievedAt: new Date("2026-04-23T00:00:00.000Z"),
          isVerified: true,
          isSeeded: true,
        },
      });
    }

    const tuitionResident = pickWorkbookCost(
      workbookRows,
      "Tuition, Fees, and Health Insurance",
      "Resident",
    );
    const tuitionNonResident = pickWorkbookCost(
      workbookRows,
      "Tuition, Fees, and Health Insurance",
      "Nonresident",
    );
    await prisma.schoolFinancialProfile.upsert({
      where: { schoolId: upserted.id },
      create: {
        schoolId: upserted.id,
        tuitionResident,
        tuitionNonResident,
        sourceLabel: "AAMC Tuition and Student Fees Reports",
        sourceUrl: AAMC_TUITION_DOWNLOAD,
        sourceEffectiveYear: 2026,
      },
      update: {
        tuitionResident,
        tuitionNonResident,
        sourceLabel: "AAMC Tuition and Student Fees Reports",
        sourceUrl: AAMC_TUITION_DOWNLOAD,
        sourceEffectiveYear: 2026,
      },
    });

    const resources = resourceTemplates({ ...school, slug, zip: upserted.zip });
    for (const [index, resource] of resources.entries()) {
      await prisma.schoolResource.create({
        data: {
          schoolId: upserted.id,
          category: resource.category,
          kind: resource.kind,
          provider: resource.provider,
          label: resource.label,
          url: resource.url,
          description: resource.description,
          isSeeded: true,
          sortOrder: index,
        },
      });
    }
  }
}
