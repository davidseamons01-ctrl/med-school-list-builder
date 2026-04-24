/**
 * Per-school OOS (out-of-state) admission friendliness for MD programs.
 *
 * Logic:
 *  - Private schools are OOS-agnostic by design and default to `oosFriendly: true`
 *    (they do not have a state residency mandate). A few are flagged as
 *    exceptions via `matchPrivateExceptions`.
 *  - Public schools default to `oosFriendly: false` unless the school's
 *    most-recently-published MSAR/class-profile % OOS matriculants is at
 *    least 15%.
 *
 * Source: AAMC MSAR published "% In-State / Out-of-State matriculants"
 * (most recent entering class reported on each school's public class
 * profile page). Where a school reports a range we use the midpoint.
 */

export type PublicOosEntry = {
  match: string;
  oosMatriculantPct: number;
  note?: string;
};

export const PUBLIC_OOS_MATRICULANT_DATA: PublicOosEntry[] = [
  { match: "University of Vermont", oosMatriculantPct: 70 },
  { match: "University of Virginia School of Medicine", oosMatriculantPct: 43 },
  { match: "University of Michigan Medical School", oosMatriculantPct: 62 },
  { match: "University of Washington School of Medicine", oosMatriculantPct: 18, note: "WWAMI regional; OOS outside 5 partner states very limited." },
  { match: "University of Pittsburgh School of Medicine", oosMatriculantPct: 58 },
  { match: "University of Maryland School of Medicine", oosMatriculantPct: 30 },
  { match: "Ohio State University College of Medicine", oosMatriculantPct: 32 },
  { match: "Oregon Health & Science University", oosMatriculantPct: 30 },
  { match: "University of Colorado School of Medicine", oosMatriculantPct: 24 },
  { match: "University of Iowa Roy J. and Lucille A. Carver College of Medicine", oosMatriculantPct: 30 },
  { match: "Indiana University School of Medicine", oosMatriculantPct: 16 },
  { match: "University of Minnesota Medical School", oosMatriculantPct: 18 },
  { match: "University of Wisconsin School of Medicine and Public Health", oosMatriculantPct: 23 },
  { match: "University of North Carolina School of Medicine", oosMatriculantPct: 6 },
  { match: "University of Florida College of Medicine", oosMatriculantPct: 9 },
  { match: "University of California, San Francisco School of Medicine", oosMatriculantPct: 15 },
  { match: "University of California, Los Angeles", oosMatriculantPct: 14 },
  { match: "David Geffen School of Medicine at UCLA", oosMatriculantPct: 14 },
  { match: "University of California, San Diego School of Medicine", oosMatriculantPct: 10 },
  { match: "University of California, Davis School of Medicine", oosMatriculantPct: 8 },
  { match: "University of California, Irvine School of Medicine", oosMatriculantPct: 8 },
  { match: "University of California, Riverside School of Medicine", oosMatriculantPct: 2, note: "California resident mission." },
  { match: "Stony Brook", oosMatriculantPct: 14 },
  { match: "SUNY Downstate", oosMatriculantPct: 6 },
  { match: "SUNY Upstate", oosMatriculantPct: 10 },
  { match: "Jacobs School of Medicine and Biomedical Sciences", oosMatriculantPct: 8, note: "University at Buffalo." },
  { match: "Rutgers New Jersey Medical School", oosMatriculantPct: 10 },
  { match: "Rutgers, Robert Wood Johnson Medical School", oosMatriculantPct: 12 },
  { match: "University of Illinois College of Medicine", oosMatriculantPct: 10 },
  { match: "University of Massachusetts T.H. Chan School of Medicine", oosMatriculantPct: 5, note: "MA resident mission." },
  { match: "University of Connecticut School of Medicine", oosMatriculantPct: 28 },
  { match: "Penn State College of Medicine", oosMatriculantPct: 52 },
  { match: "University of Kansas School of Medicine", oosMatriculantPct: 12 },
  { match: "University of Nebraska College of Medicine", oosMatriculantPct: 15 },
  { match: "University of Kentucky College of Medicine", oosMatriculantPct: 28 },
  { match: "University of Louisville School of Medicine", oosMatriculantPct: 17 },
  { match: "University of Cincinnati College of Medicine", oosMatriculantPct: 28 },
  { match: "Northeast Ohio Medical University", oosMatriculantPct: 6 },
  { match: "Boonshoft School of Medicine Wright State University", oosMatriculantPct: 12 },
  { match: "University of Toledo College of Medicine and Life Sciences", oosMatriculantPct: 12 },
  { match: "Wayne State University School of Medicine", oosMatriculantPct: 12 },
  { match: "Oakland University William Beaumont", oosMatriculantPct: 18 },
  { match: "Michigan State University College of Human Medicine", oosMatriculantPct: 18 },
  { match: "Western Michigan University Homer Stryker", oosMatriculantPct: 45, note: "Private affiliation; operates like private matriculation mix." },
  { match: "Central Michigan University", oosMatriculantPct: 15 },
  { match: "Virginia Commonwealth University School of Medicine", oosMatriculantPct: 18 },
  { match: "Eastern Virginia Medical School", oosMatriculantPct: 30 },
  { match: "Virginia Tech Carilion School of Medicine", oosMatriculantPct: 58 },
  { match: "East Carolina University", oosMatriculantPct: 0, note: "NC resident only." },
  { match: "Brody School of Medicine", oosMatriculantPct: 0, note: "NC resident only." },
  { match: "Wake Forest", oosMatriculantPct: 45, note: "Private." },
  { match: "Medical University of South Carolina", oosMatriculantPct: 15 },
  { match: "University of South Carolina School of Medicine, Columbia", oosMatriculantPct: 10 },
  { match: "University of South Carolina School of Medicine, Greenville", oosMatriculantPct: 10 },
  { match: "Medical College of Georgia", oosMatriculantPct: 8 },
  { match: "University of Georgia School of Medicine", oosMatriculantPct: 10 },
  { match: "Florida State University College of Medicine", oosMatriculantPct: 3, note: "FL resident mission." },
  { match: "Florida International University", oosMatriculantPct: 12 },
  { match: "USF Health Morsani", oosMatriculantPct: 17 },
  { match: "University of Central Florida College of Medicine", oosMatriculantPct: 18 },
  { match: "Charles E. Schmidt College of Medicine at Florida Atlantic", oosMatriculantPct: 10 },
  { match: "University of Alabama at Birmingham Marnix E. Heersink", oosMatriculantPct: 18 },
  { match: "University of Mississippi School of Medicine", oosMatriculantPct: 1, note: "MS resident mandate." },
  { match: "University of Tennessee Health Science Center", oosMatriculantPct: 10 },
  { match: "East Tennessee State University", oosMatriculantPct: 15 },
  { match: "Marshall University Joan C. Edwards", oosMatriculantPct: 30 },
  { match: "West Virginia University School of Medicine", oosMatriculantPct: 40 },
  { match: "University of Arkansas for Medical Sciences", oosMatriculantPct: 10 },
  { match: "University of Oklahoma College of Medicine", oosMatriculantPct: 15 },
  { match: "LSU Health Sciences Center School of Medicine in New Orleans", oosMatriculantPct: 3, note: "LA resident mandate." },
  { match: "Louisiana State University School of Medicine in Shreveport", oosMatriculantPct: 3 },
  { match: "University of Texas Southwestern Medical School", oosMatriculantPct: 10 },
  { match: "McGovern Medical School at UTHealth Houston", oosMatriculantPct: 10 },
  { match: "University of Texas Medical Branch", oosMatriculantPct: 10 },
  { match: "The University of Texas at San Antonio", oosMatriculantPct: 8 },
  { match: "The University of Texas at Tyler", oosMatriculantPct: 10 },
  { match: "Dell Medical School", oosMatriculantPct: 10 },
  { match: "Texas A&M University School of Medicine", oosMatriculantPct: 10 },
  { match: "Texas Tech University Health Sciences Center School of Medicine", oosMatriculantPct: 10 },
  { match: "Paul L. Foster School of Medicine", oosMatriculantPct: 10 },
  { match: "University of Texas Rio Grande Valley", oosMatriculantPct: 8 },
  { match: "University of Houston Tilman J. Fertitta", oosMatriculantPct: 10 },
  { match: "University of Missouri-Columbia School of Medicine", oosMatriculantPct: 15 },
  { match: "University of Missouri-Kansas City School of Medicine", oosMatriculantPct: 18 },
  { match: "University of Hawaii at Manoa", oosMatriculantPct: 8 },
  { match: "University of New Mexico School of Medicine", oosMatriculantPct: 10 },
  { match: "University of Nevada, Reno School of Medicine", oosMatriculantPct: 18 },
  { match: "Kirk Kerkorian School of Medicine at UNLV", oosMatriculantPct: 15 },
  { match: "University of Arizona College of Medicine - Tucson", oosMatriculantPct: 20 },
  { match: "University of Arizona College of Medicine - Phoenix", oosMatriculantPct: 35 },
  { match: "Spencer Fox Eccles School of Medicine at the University of Utah", oosMatriculantPct: 18 },
  { match: "University of North Dakota School of Medicine", oosMatriculantPct: 10 },
  { match: "University of South Dakota Sanford School of Medicine", oosMatriculantPct: 10 },
  { match: "Renaissance School of Medicine at Stony Brook University", oosMatriculantPct: 14 },
  { match: "CUNY School of Medicine", oosMatriculantPct: 0, note: "NY city/state resident mandate." },
  { match: "Southern Illinois University School of Medicine", oosMatriculantPct: 4, note: "IL resident mandate." },
  { match: "Medical College of Wisconsin", oosMatriculantPct: 62, note: "Private." },
];

const PRIVATE_EXCEPTIONS_TO_FALSE: string[] = [
  "CUNY School of Medicine",
  "Charles R. Drew University",
  "Ponce Health Sciences University",
  "Universidad Central del Caribe",
  "San Juan Bautista",
  "University of Puerto Rico School of Medicine",
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function computeOosProfile(school: {
  name: string;
  control: string;
}): { oosFriendly: boolean; oosMatriculantPct: number | null } {
  const name = normalize(school.name);

  // Public / state-governed schools: match against curated table.
  const publicEntry = PUBLIC_OOS_MATRICULANT_DATA.find((entry) =>
    name.includes(normalize(entry.match)),
  );
  if (publicEntry) {
    return {
      oosFriendly: publicEntry.oosMatriculantPct >= 15,
      oosMatriculantPct: publicEntry.oosMatriculantPct,
    };
  }

  // Private by default = OOS friendly.
  if (school.control === "PRIVATE") {
    const isException = PRIVATE_EXCEPTIONS_TO_FALSE.some((ex) =>
      name.includes(normalize(ex)),
    );
    return { oosFriendly: !isException, oosMatriculantPct: null };
  }

  return { oosFriendly: false, oosMatriculantPct: null };
}
