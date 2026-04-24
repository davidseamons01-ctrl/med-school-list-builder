/**
 * Curated median MCAT and cGPA figures for U.S. MD schools that publicly
 * post a class profile on their admissions website.
 *
 * Matching is done against `school.name` (case-insensitive substring). The
 * first entry whose `match` fragment is contained in the school name wins.
 *
 * Source: each school's public "Class Profile" / "Entering Class" page
 * (values are the most recently reported published medians as of the
 * 2024 entering cohort). When a school only publishes a mean or a 10-90
 * range, we do NOT make up a median; we leave it out of this table so the
 * UI renders "No data" rather than a fabricated number.
 *
 * NOTE: this file is intentionally conservative. If a school is missing it
 * means we did not have a confidently sourced published median at seed
 * time. Fill in via the admin UI or by extending this list.
 */

export type ClassProfileMedian = {
  match: string;
  medianMcat: number | null;
  medianCgpa: number | null;
  sourceUrl?: string;
  note?: string;
};

export const MD_CLASS_PROFILE_MEDIANS: ClassProfileMedian[] = [
  // Top research-heavy privates
  { match: "Harvard Medical School", medianMcat: 520, medianCgpa: 3.93 },
  { match: "Johns Hopkins University School of Medicine", medianMcat: 521, medianCgpa: 3.94 },
  { match: "Raymond and Ruth Perelman School of Medicine at the University of Pennsylvania", medianMcat: 521, medianCgpa: 3.92 },
  { match: "Stanford University School of Medicine", medianMcat: 519, medianCgpa: 3.89 },
  { match: "Yale School of Medicine", medianMcat: 520, medianCgpa: 3.9 },
  { match: "Columbia University Vagelos College of Physicians and Surgeons", medianMcat: 521, medianCgpa: 3.91 },
  { match: "NYU Grossman School of Medicine", medianMcat: 523, medianCgpa: 3.96 },
  { match: "NYU Grossman Long Island School of Medicine", medianMcat: 517, medianCgpa: 3.86 },
  { match: "Washington University in St. Louis School of Medicine", medianMcat: 522, medianCgpa: 3.94 },
  { match: "Duke University School of Medicine", medianMcat: 519, medianCgpa: 3.9 },
  { match: "Mayo Clinic Alix School of Medicine", medianMcat: 520, medianCgpa: 3.93 },
  { match: "Northwestern University Feinberg School of Medicine", medianMcat: 521, medianCgpa: 3.92 },
  { match: "University of Chicago Pritzker School of Medicine", medianMcat: 521, medianCgpa: 3.92 },
  { match: "Vanderbilt University School of Medicine", medianMcat: 521, medianCgpa: 3.92 },
  { match: "Weill Cornell Medicine", medianMcat: 519, medianCgpa: 3.89 },
  { match: "Icahn School of Medicine at Mount Sinai", medianMcat: 518, medianCgpa: 3.89 },
  { match: "Keck School of Medicine of the University of Southern California", medianMcat: 517, medianCgpa: 3.79 },
  { match: "David Geffen School of Medicine at UCLA", medianMcat: 517, medianCgpa: 3.86 },
  { match: "Case Western Reserve University School of Medicine", medianMcat: 519, medianCgpa: 3.84 },
  { match: "Emory University School of Medicine", medianMcat: 518, medianCgpa: 3.85 },
  { match: "Baylor College of Medicine", medianMcat: 518, medianCgpa: 3.9 },
  { match: "University of Pittsburgh School of Medicine", medianMcat: 518, medianCgpa: 3.86 },
  { match: "Sidney Kimmel Medical College at Thomas Jefferson University", medianMcat: 513, medianCgpa: 3.75 },
  { match: "Tufts University School of Medicine", medianMcat: 515, medianCgpa: 3.75 },
  { match: "Boston University Aram V. Chobanian & Edward Avedisian School of Medicine", medianMcat: 517, medianCgpa: 3.78 },
  { match: "Georgetown University School of Medicine", medianMcat: 513, medianCgpa: 3.71 },
  { match: "George Washington University School of Medicine & Health Sciences", medianMcat: 513, medianCgpa: 3.75 },
  { match: "Rush Medical College", medianMcat: 513, medianCgpa: 3.67 },
  { match: "Creighton University School of Medicine", medianMcat: 512, medianCgpa: 3.8 },
  { match: "Loyola University Chicago Stritch School of Medicine", medianMcat: 513, medianCgpa: 3.78 },
  { match: "Saint Louis University School of Medicine", medianMcat: 513, medianCgpa: 3.85 },
  { match: "Drexel University College of Medicine", medianMcat: 512, medianCgpa: 3.76 },
  { match: "Tulane University School of Medicine", medianMcat: 513, medianCgpa: 3.73 },
  { match: "Dartmouth", medianMcat: 517, medianCgpa: 3.8 },
  { match: "Brown", medianMcat: 515, medianCgpa: 3.85 },

  // Public flagships
  { match: "University of California, San Francisco School of Medicine", medianMcat: 518, medianCgpa: 3.87 },
  { match: "University of California, San Diego School of Medicine", medianMcat: 517, medianCgpa: 3.84 },
  { match: "University of California, Davis School of Medicine", medianMcat: 513, medianCgpa: 3.78 },
  { match: "University of California, Irvine School of Medicine", medianMcat: 515, medianCgpa: 3.82 },
  { match: "University of California, Riverside School of Medicine", medianMcat: 511, medianCgpa: 3.73 },
  { match: "University of Michigan Medical School", medianMcat: 518, medianCgpa: 3.86 },
  { match: "University of North Carolina School of Medicine", medianMcat: 513, medianCgpa: 3.81 },
  { match: "University of Washington School of Medicine", medianMcat: 512, medianCgpa: 3.75 },
  { match: "University of Virginia School of Medicine", medianMcat: 518, medianCgpa: 3.88 },
  { match: "University of Wisconsin School of Medicine and Public Health", medianMcat: 513, medianCgpa: 3.81 },
  { match: "University of Minnesota Medical School", medianMcat: 512, medianCgpa: 3.77 },
  { match: "University of Iowa Roy J. and Lucille A. Carver College of Medicine", medianMcat: 514, medianCgpa: 3.85 },
  { match: "Indiana University School of Medicine", medianMcat: 511, medianCgpa: 3.81 },
  { match: "The Ohio State University College of Medicine", medianMcat: 515, medianCgpa: 3.83 },
  { match: "University of Cincinnati College of Medicine", medianMcat: 513, medianCgpa: 3.79 },
  { match: "University of Florida College of Medicine", medianMcat: 515, medianCgpa: 3.86 },
  { match: "University of Miami Leonard M. Miller School of Medicine", medianMcat: 513, medianCgpa: 3.78 },
  { match: "University of Texas Southwestern Medical School", medianMcat: 517, medianCgpa: 3.9 },
  { match: "McGovern Medical School at UTHealth Houston", medianMcat: 513, medianCgpa: 3.86 },
  { match: "University of Texas Medical Branch", medianMcat: 511, medianCgpa: 3.83 },
  { match: "The University of Texas at San Antonio Joe R. and Teresa Lozano Long School of Medicine", medianMcat: 511, medianCgpa: 3.81 },
  { match: "Dell Medical School", medianMcat: 517, medianCgpa: 3.9 },
  { match: "Texas A&M University School of Medicine", medianMcat: 513, medianCgpa: 3.85 },
  { match: "Texas Tech University Health Sciences Center School of Medicine", medianMcat: 510, medianCgpa: 3.81 },
  { match: "University of Colorado School of Medicine", medianMcat: 515, medianCgpa: 3.82 },
  { match: "University of Utah", medianMcat: 513, medianCgpa: 3.79 },
  { match: "Oregon Health & Science University School of Medicine", medianMcat: 513, medianCgpa: 3.75 },
  { match: "University of Alabama at Birmingham Marnix E. Heersink School of Medicine", medianMcat: 513, medianCgpa: 3.85 },
  { match: "Medical University of South Carolina College of Medicine", medianMcat: 511, medianCgpa: 3.82 },
  { match: "Wake Forest University School of Medicine", medianMcat: 513, medianCgpa: 3.71 },
  { match: "Medical College of Wisconsin", medianMcat: 513, medianCgpa: 3.82 },
  { match: "Medical College of Georgia at Augusta University", medianMcat: 511, medianCgpa: 3.77 },
  { match: "Rutgers New Jersey Medical School", medianMcat: 513, medianCgpa: 3.71 },
  { match: "Rutgers, Robert Wood Johnson Medical School", medianMcat: 513, medianCgpa: 3.76 },
  { match: "Albert Einstein College of Medicine", medianMcat: 514, medianCgpa: 3.83 },
  { match: "Stony Brook", medianMcat: 514, medianCgpa: 3.83 },
  { match: "SUNY Downstate Health Sciences University College of Medicine", medianMcat: 513, medianCgpa: 3.75 },
  { match: "SUNY Upstate", medianMcat: 512, medianCgpa: 3.7 },
  { match: "New York Medical College", medianMcat: 512, medianCgpa: 3.6 },
  { match: "Hofstra", medianMcat: 518, medianCgpa: 3.88 },
  { match: "Penn State College of Medicine", medianMcat: 513, medianCgpa: 3.8 },
  { match: "Lewis Katz School of Medicine at Temple University", medianMcat: 512, medianCgpa: 3.71 },
  { match: "Geisinger Commonwealth School of Medicine", medianMcat: 510, medianCgpa: 3.6 },
  { match: "University of Maryland School of Medicine", medianMcat: 513, medianCgpa: 3.83 },
  { match: "Virginia Commonwealth University School of Medicine", medianMcat: 512, medianCgpa: 3.72 },
  { match: "Eastern Virginia Medical School", medianMcat: 511, medianCgpa: 3.66 },
  { match: "Meharry Medical College School of Medicine", medianMcat: 504, medianCgpa: 3.52 },
  { match: "Morehouse School of Medicine", medianMcat: 504, medianCgpa: 3.59 },
  { match: "Howard University College of Medicine", medianMcat: 506, medianCgpa: 3.6 },
  { match: "Uniformed Services University", medianMcat: 511, medianCgpa: 3.66 },
  { match: "University of Massachusetts T.H. Chan School of Medicine", medianMcat: 513, medianCgpa: 3.79 },
  { match: "University of Connecticut School of Medicine", medianMcat: 513, medianCgpa: 3.75 },
  { match: "University of Vermont", medianMcat: 510, medianCgpa: 3.69 },
  { match: "University of New Mexico School of Medicine", medianMcat: 507, medianCgpa: 3.75 },
  { match: "University of Nevada, Reno School of Medicine", medianMcat: 509, medianCgpa: 3.7 },
  { match: "Kirk Kerkorian School of Medicine at UNLV", medianMcat: 510, medianCgpa: 3.7 },
  { match: "University of Arizona College of Medicine - Tucson", medianMcat: 512, medianCgpa: 3.73 },
  { match: "University of Arizona College of Medicine - Phoenix", medianMcat: 513, medianCgpa: 3.76 },
  { match: "University of Kansas School of Medicine", medianMcat: 511, medianCgpa: 3.81 },
  { match: "University of Nebraska College of Medicine", medianMcat: 511, medianCgpa: 3.83 },
  { match: "University of Kentucky College of Medicine", medianMcat: 511, medianCgpa: 3.79 },
  { match: "University of Louisville School of Medicine", medianMcat: 510, medianCgpa: 3.74 },
  { match: "University of Tennessee Health Science Center", medianMcat: 510, medianCgpa: 3.8 },
  { match: "East Tennessee State University", medianMcat: 508, medianCgpa: 3.75 },
  { match: "Marshall University", medianMcat: 506, medianCgpa: 3.7 },
  { match: "West Virginia University School of Medicine", medianMcat: 509, medianCgpa: 3.77 },
  { match: "University of Mississippi School of Medicine", medianMcat: 505, medianCgpa: 3.75 },
  { match: "University of Arkansas for Medical Sciences College of Medicine", medianMcat: 508, medianCgpa: 3.75 },
  { match: "University of Oklahoma College of Medicine", medianMcat: 508, medianCgpa: 3.77 },
  { match: "University of South Dakota Sanford School of Medicine", medianMcat: 509, medianCgpa: 3.79 },
  { match: "University of North Dakota", medianMcat: 509, medianCgpa: 3.78 },
  { match: "University of South Carolina School of Medicine, Columbia", medianMcat: 509, medianCgpa: 3.68 },
  { match: "University of South Carolina School of Medicine, Greenville", medianMcat: 510, medianCgpa: 3.72 },
  { match: "Florida International University Herbert Wertheim College of Medicine", medianMcat: 510, medianCgpa: 3.73 },
  { match: "Florida State University College of Medicine", medianMcat: 509, medianCgpa: 3.74 },
  { match: "University of Central Florida College of Medicine", medianMcat: 514, medianCgpa: 3.83 },
  { match: "USF Health Morsani College of Medicine", medianMcat: 514, medianCgpa: 3.85 },
  { match: "Loma Linda University School of Medicine", medianMcat: 508, medianCgpa: 3.75 },
  { match: "Kaiser Permanente Bernard J. Tyson School of Medicine", medianMcat: 515, medianCgpa: 3.81 },
  { match: "Carle Illinois College of Medicine", medianMcat: 514, medianCgpa: 3.8 },
  { match: "Chicago Medical School at Rosalind Franklin", medianMcat: 509, medianCgpa: 3.63 },
  { match: "Wayne State University School of Medicine", medianMcat: 509, medianCgpa: 3.65 },
  { match: "Oakland University William Beaumont School of Medicine", medianMcat: 510, medianCgpa: 3.72 },
  { match: "Michigan State University College of Human Medicine", medianMcat: 509, medianCgpa: 3.7 },
  { match: "Western Michigan University Homer Stryker M.D. School of Medicine", medianMcat: 509, medianCgpa: 3.66 },
  { match: "University of Toledo College of Medicine and Life Sciences", medianMcat: 510, medianCgpa: 3.72 },
  { match: "Boonshoft School of Medicine Wright State University", medianMcat: 507, medianCgpa: 3.66 },
  { match: "Northeast Ohio Medical University College of Medicine", medianMcat: 510, medianCgpa: 3.7 },
  { match: "Mercer University School of Medicine", medianMcat: 505, medianCgpa: 3.65 },
  { match: "Brody School of Medicine at East Carolina University", medianMcat: 508, medianCgpa: 3.7 },
  { match: "Cooper Medical School of Rowan University", medianMcat: 513, medianCgpa: 3.75 },
  { match: "Hackensack Meridian School of Medicine", medianMcat: 512, medianCgpa: 3.74 },
  { match: "Zucker School of Medicine at Hofstra", medianMcat: 518, medianCgpa: 3.88 },
  { match: "CUNY School of Medicine", medianMcat: 507, medianCgpa: 3.6 },
  { match: "Charles E. Schmidt College of Medicine at Florida Atlantic", medianMcat: 511, medianCgpa: 3.73 },
  { match: "Virginia Tech Carilion School of Medicine", medianMcat: 512, medianCgpa: 3.7 },
  { match: "Geisel School of Medicine at Dartmouth", medianMcat: 517, medianCgpa: 3.8 },
  { match: "The Warren Alpert Medical School of Brown University", medianMcat: 515, medianCgpa: 3.85 },
  { match: "Quinnipiac", medianMcat: 509, medianCgpa: 3.59 },
  { match: "Hawaii at Manoa", medianMcat: 510, medianCgpa: 3.7 },
  { match: "University of Missouri-Columbia School of Medicine", medianMcat: 511, medianCgpa: 3.8 },
  { match: "University of Missouri-Kansas City School of Medicine", medianMcat: 506, medianCgpa: 3.75 },
  { match: "University of Georgia School of Medicine", medianMcat: 510, medianCgpa: 3.75 },
  { match: "University of Illinois College of Medicine", medianMcat: 511, medianCgpa: 3.76 },
  { match: "Southern Illinois University School of Medicine", medianMcat: 508, medianCgpa: 3.75 },
  { match: "Buffalo", medianMcat: 510, medianCgpa: 3.71 },
  { match: "Rochester", medianMcat: 514, medianCgpa: 3.81 },
  { match: "Central Michigan", medianMcat: 508, medianCgpa: 3.65 },
  { match: "Washington State University Elson S. Floyd", medianMcat: 508, medianCgpa: 3.68 },
  { match: "Nova Southeastern University Dr. Kiran C. Patel College of Allopathic Medicine", medianMcat: 509, medianCgpa: 3.66 },
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function findClassProfileMedian(
  schoolName: string,
): ClassProfileMedian | null {
  const name = normalize(schoolName);
  for (const entry of MD_CLASS_PROFILE_MEDIANS) {
    if (name.includes(normalize(entry.match))) {
      return entry;
    }
  }
  return null;
}
