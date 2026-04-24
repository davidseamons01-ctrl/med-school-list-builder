/**
 * Deterministic deep-link builder for the per-school Research Hub.
 *
 * We intentionally do NOT scrape Numbeo, Niche, AreaVibes, Zillow, SDN, or
 * Reddit. Their terms of service restrict automated collection and their
 * data quality varies by school. Instead, we construct precise pre-filtered
 * URLs so the user lands on the right result with a single click.
 */

export type ResearchLink = {
  title: string;
  href: string;
  description: string;
};

export type ResearchSection = {
  id: string;
  label: string;
  blurb: string;
  links: ResearchLink[];
};

export type SchoolLike = {
  name: string;
  city: string;
  state: string;
  zip?: string | null;
  lat?: number | null;
  lng?: number | null;
  websiteUrl?: string | null;
  admissionsUrl?: string | null;
  studentAffairsUrl?: string | null;
  financialAidUrl?: string | null;
  secondaryPromptsUrl?: string | null;
};

const enc = (s: string) => encodeURIComponent(s);

function redditSearch(query: string): string {
  return `https://www.reddit.com/search/?q=${enc(query)}&type=link&sort=new`;
}

function redditSearchInSub(sub: string, query: string): string {
  return `https://www.reddit.com/r/${enc(sub)}/search/?q=${enc(query)}&restrict_sr=on&sort=new`;
}

function citySlug(city: string): string {
  return city.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function citySubredditGuess(city: string): string {
  // Best-effort city subreddit; Reddit will 404 gracefully if it doesn't exist.
  return citySlug(city);
}

function nicheCityUrl(city: string, state: string): string {
  return `https://www.niche.com/places-to-live/${enc(
    city.toLowerCase().replace(/\s+/g, "-"),
  )}-${enc(state.toLowerCase().replace(/\s+/g, "-"))}/`;
}

function areaVibesUrl(city: string, state: string): string {
  return `https://www.areavibes.com/${enc(
    city.toLowerCase().replace(/\s+/g, "+"),
  )}-${enc(state.toLowerCase().replace(/\s+/g, "+"))}/livability/`;
}

function numbeoUrl(city: string, state: string): string {
  return `https://www.numbeo.com/cost-of-living/in/${enc(
    city.replace(/\s+/g, "-"),
  )}-${enc(state.replace(/\s+/g, "-"))}`;
}

function zillowUrl(school: SchoolLike): string {
  if (school.zip) {
    return `https://www.zillow.com/homes/for_rent/${enc(school.zip)}_rb/`;
  }
  return `https://www.zillow.com/homes/for_rent/${enc(
    `${school.city}-${school.state}`,
  )}_rb/`;
}

function mitLivingWageStateUrl(state: string): string {
  const states: Record<string, string> = {
    Alabama: "01",
    Alaska: "02",
    Arizona: "04",
    Arkansas: "05",
    California: "06",
    Colorado: "08",
    Connecticut: "09",
    Delaware: "10",
    "District of Columbia": "11",
    Florida: "12",
    Georgia: "13",
    Hawaii: "15",
    Idaho: "16",
    Illinois: "17",
    Indiana: "18",
    Iowa: "19",
    Kansas: "20",
    Kentucky: "21",
    Louisiana: "22",
    Maine: "23",
    Maryland: "24",
    Massachusetts: "25",
    Michigan: "26",
    Minnesota: "27",
    Mississippi: "28",
    Missouri: "29",
    Montana: "30",
    Nebraska: "31",
    Nevada: "32",
    "New Hampshire": "33",
    "New Jersey": "34",
    "New Mexico": "35",
    "New York": "36",
    "North Carolina": "37",
    "North Dakota": "38",
    Ohio: "39",
    Oklahoma: "40",
    Oregon: "41",
    Pennsylvania: "42",
    "Rhode Island": "44",
    "South Carolina": "45",
    "South Dakota": "46",
    Tennessee: "47",
    Texas: "48",
    Utah: "49",
    Vermont: "50",
    Virginia: "51",
    Washington: "53",
    "West Virginia": "54",
    Wisconsin: "55",
    Wyoming: "56",
    "Puerto Rico": "72",
  };
  const code = states[state];
  return code
    ? `https://livingwage.mit.edu/states/${code}`
    : `https://livingwage.mit.edu/`;
}

function googleEarthUrl(school: SchoolLike): string {
  if (school.lat != null && school.lng != null) {
    return `https://earth.google.com/web/@${school.lat},${school.lng},500a,0d,35y,0h,45t,0r`;
  }
  return `https://earth.google.com/web/search/${enc(school.name)}`;
}

function googleMapsStreetView(school: SchoolLike): string {
  if (school.lat != null && school.lng != null) {
    return `https://www.google.com/maps/@${school.lat},${school.lng},3a,75y,90h,90t/data=!3m6!1e1`;
  }
  return `https://www.google.com/maps/search/${enc(`${school.name} ${school.city}`)}`;
}

function youtubeSearch(query: string): string {
  return `https://www.youtube.com/results?search_query=${enc(query)}`;
}

function sdnForumSearch(schoolName: string): string {
  return `https://forums.studentdoctor.net/search/?q=${enc(schoolName)}&t=post&o=date`;
}

function sdnInterviewFeedback(schoolName: string): string {
  return `https://forums.studentdoctor.net/search/?q=${enc(
    `${schoolName} interview feedback`,
  )}&t=post&o=date`;
}

function mshqSecondaries(schoolName: string): string {
  return `https://medicalschoolhq.net/?s=${enc(`${schoolName} secondary`)}`;
}

function aamcMsarUrl(): string {
  return "https://apps.aamc.org/msar-ui/";
}

function aamcTuitionSurveyUrl(): string {
  return "https://www.aamc.org/data-reports/students-residents/report/tuition-and-student-fees-reports";
}

export function buildResearchSections(school: SchoolLike): ResearchSection[] {
  const fullName = school.name;
  const cityState = `${school.city}, ${school.state}`;
  const citySubReddit = citySubredditGuess(school.city);

  return [
    {
      id: "hard-numbers",
      label: "Hard Numbers · Stats, Competitiveness, Financial Aid",
      blurb:
        "Tuition, COA, medians, and applicant-narrated Sankey diagrams. Use these to verify competitiveness and the real financial damage.",
      links: [
        {
          title: "Official admissions page",
          href: school.admissionsUrl ?? school.websiteUrl ?? `https://www.google.com/search?q=${enc(`${fullName} admissions`)}`,
          description: "Tuition, class profile, MCAT/GPA medians, mission statement.",
        },
        {
          title: "Official financial aid page",
          href: school.financialAidUrl ?? `https://www.google.com/search?q=${enc(`${fullName} financial aid`)}`,
          description: "Institutional grants, scholarships, average debt at graduation.",
        },
        {
          title: "AAMC MSAR (official medians)",
          href: aamcMsarUrl(),
          description: "AAMC-published MCAT/GPA medians and matriculant breakdowns (subscription).",
        },
        {
          title: "AAMC Tuition & Student Fees Report",
          href: aamcTuitionSurveyUrl(),
          description: "Public AAMC dataset for year-over-year tuition + mandatory fees.",
        },
        {
          title: "r/premed Sankey diagrams",
          href: redditSearchInSub(
            "premed",
            `Sankey ${fullName}`,
          ),
          description: "Real applicants' stats, hours, acceptances, and rejections for this school.",
        },
        {
          title: "SDN school-specific forum thread",
          href: sdnForumSearch(fullName),
          description: "WedgedDawg-style WARS discussion and application-cycle threads.",
        },
      ],
    },
    {
      id: "cost-of-living",
      label: "Cost of Living · What $3,000/month Actually Buys",
      blurb:
        "Rent, groceries, childcare, and safety — keyed to this school's metro so you can see the reality of the area.",
      links: [
        {
          title: "MIT Living Wage Calculator (state)",
          href: mitLivingWageStateUrl(school.state),
          description: "Family-size-specific monthly budgets for housing, food, child care, medical, and transport.",
        },
        {
          title: "Numbeo cost-of-living comparison",
          href: numbeoUrl(school.city, school.state),
          description: "Crowdsourced line-item costs for groceries, utilities, rent, and transit.",
        },
        {
          title: "Niche — place profile",
          href: nicheCityUrl(school.city, school.state),
          description: "Neighborhood grades, school district quality, family-friendliness.",
        },
        {
          title: "AreaVibes livability report",
          href: areaVibesUrl(school.city, school.state),
          description: "Letter grades for crime, amenities, housing, and cost of living.",
        },
        {
          title: school.zip ? `Zillow rentals near ${school.zip}` : `Zillow rentals in ${cityState}`,
          href: zillowUrl(school),
          description: "Live rental inventory with photos — see exactly what your money gets.",
        },
      ],
    },
    {
      id: "family-culture",
      label: "Family Support, Spouses, and Culture",
      blurb:
        "Beyond brochures: spouse/partner networks, city-local parenting intel, and how the school writes its secondaries.",
      links: [
        {
          title: "School Student Affairs / Wellness hub",
          href: school.studentAffairsUrl ?? `https://www.google.com/search?q=${enc(`${fullName} student affairs spouse partner`)}`,
          description: "Spouse & partner associations, student family networks, wellness programs.",
        },
        {
          title: `r/${citySubReddit} (city subreddit)`,
          href: `https://www.reddit.com/r/${enc(citySubReddit)}/`,
          description: `Locals' unfiltered take on moving with a family, daycare, neighborhoods in ${school.city}.`,
        },
        {
          title: "City subreddit family search",
          href: redditSearchInSub(citySubReddit, "medical student family daycare neighborhoods"),
          description: "Pre-filtered search for the family-specific threads in the city subreddit.",
        },
        {
          title: "Medical School HQ — historical secondaries",
          href: school.secondaryPromptsUrl ?? mshqSecondaries(fullName),
          description: "Prior-year secondary prompts reveal what this school actually values.",
        },
      ],
    },
    {
      id: "facilities-vibe",
      label: "Facilities, Vibe, and Unfiltered Student Experiences",
      blurb:
        "See the campus for yourself and hear what students say when admissions isn't listening.",
      links: [
        {
          title: "Google Maps Street View",
          href: googleMapsStreetView(school),
          description: "Walk around the hospital and academic buildings before you ever visit.",
        },
        {
          title: "Google Earth flyover",
          href: googleEarthUrl(school),
          description: "Aerial view of the campus footprint and surrounding neighborhood.",
        },
        {
          title: "r/medicalschool Name and Fame / Name and Shame",
          href: redditSearchInSub(
            "medicalschool",
            `name and fame ${fullName}`,
          ),
          description: "Brutally honest alumni reviews posted every spring.",
        },
        {
          title: "SDN interview feedback database",
          href: sdnInterviewFeedback(fullName),
          description: "Interview-day vibes, faculty attitudes, and facility descriptions from real applicants.",
        },
        {
          title: "YouTube — Day in the Life (unofficial)",
          href: youtubeSearch(`day in the life medical student ${fullName}`),
          description: "Student-made vlogs showing study rooms, lecture halls, and the actual daily grind.",
        },
      ],
    },
  ];
}
