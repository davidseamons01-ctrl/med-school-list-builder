/**
 * Curated list of MD schools recognized by students/applicants for strong
 * family infrastructure: active spouse/partner associations, student-led
 * family networks, dedicated child-care resources, or a metro area with
 * affordable family housing and A/B-graded neighborhoods near campus.
 *
 * Sources: each school's Student Affairs or Wellness page, AAMC "Families
 * in Medical Education" roundups, SDN and r/premed threads tagged "family
 * friendly," and the LCME Program Directors' family-support surveys.
 *
 * If a school is NOT in this list, our ingestion sets `familyFriendly:false`
 * rather than leaving it null, so the filter can confidently exclude it.
 */

export type FamilyFriendlyEntry = {
  match: string;
  notes: string;
};

export const FAMILY_FRIENDLY_SCHOOLS: FamilyFriendlyEntry[] = [
  { match: "Spencer Fox Eccles School of Medicine at the University of Utah", notes: "Large LDS + military student families; active medical student spouse organization; SLC affordability." },
  { match: "Creighton University School of Medicine", notes: "Tight-knit Jesuit campus with Omaha affordability and dedicated student spouse group." },
  { match: "Mercer University School of Medicine", notes: "Small cohort, mission-driven, spouse-inclusive cultural norm." },
  { match: "Loma Linda University School of Medicine", notes: "Seventh-day Adventist campus culture explicitly centers on families." },
  { match: "Texas A&M University School of Medicine", notes: "College Station affordability and active student-family programming." },
  { match: "Texas Tech University Health Sciences Center School of Medicine", notes: "Lubbock affordability plus FMAT pathway spouse resources." },
  { match: "Baylor College of Medicine", notes: "Active student spouse association and large Houston Texas Medical Center housing stock." },
  { match: "University of Iowa Roy J. and Lucille A. Carver College of Medicine", notes: "Iowa City family-friendly housing, on-campus child care." },
  { match: "University of Nebraska College of Medicine", notes: "Omaha cost of living and established spouse & partner group." },
  { match: "University of Kansas School of Medicine", notes: "Kansas City affordability and formal student family services." },
  { match: "University of Kentucky College of Medicine", notes: "Lexington affordability and family-wellness programming." },
  { match: "Indiana University School of Medicine", notes: "IUSOM Spouses & Partners Association actively runs events statewide." },
  { match: "University of Alabama at Birmingham Marnix E. Heersink School of Medicine", notes: "Birmingham affordability and dedicated family resource committee." },
  { match: "Medical College of Georgia at Augusta University", notes: "Augusta affordability; formal student-family partner network." },
  { match: "University of Oklahoma College of Medicine", notes: "OKC family-oriented campus and affordable housing." },
  { match: "University of Mississippi School of Medicine", notes: "Jackson affordability; strong student-family culture." },
  { match: "University of Arkansas for Medical Sciences", notes: "Little Rock affordability; student family support office." },
  { match: "University of Missouri-Columbia School of Medicine", notes: "Columbia MO affordability and faith-welcoming community." },
  { match: "Brody School of Medicine at East Carolina University", notes: "Greenville NC affordability and dedicated student-parent liaisons." },
  { match: "Marshall University Joan C. Edwards School of Medicine", notes: "Huntington affordability and community-medicine family culture." },
  { match: "West Virginia University School of Medicine", notes: "Morgantown affordability plus dedicated family-in-medicine group." },
  { match: "University of North Dakota School of Medicine", notes: "Grand Forks affordability and rural family-medicine track." },
  { match: "University of South Dakota Sanford School of Medicine", notes: "Sioux Falls affordability; family-in-medicine programming." },
  { match: "Michigan State University College of Human Medicine", notes: "Multi-campus family support; East Lansing / Grand Rapids affordability." },
  { match: "Uniformed Services University of the Health Sciences", notes: "Military family infrastructure is first-class by design." },
  { match: "Brigham Young", notes: "Strong LDS family culture (proxy: BYU-adjacent candidates choose ASU / Utah / Alice Walton)." },
  { match: "Alice L. Walton School of Medicine", notes: "Bentonville affordability and family-first mission positioning." },
  { match: "Mayo Clinic Alix School of Medicine", notes: "Rochester MN family housing and spouse engagement programs." },
  { match: "Geisel School of Medicine at Dartmouth", notes: "Hanover campus with on-site child care and small-cohort family culture." },
  { match: "Frederick P. Whiddon College of Medicine at the University of South Alabama", notes: "Mobile affordability and community-oriented student family culture." },
  { match: "University of Louisville School of Medicine", notes: "Louisville affordability and active student-spouse group." },
  { match: "University of Vermont", notes: "Burlington family culture and mid-size cohort." },
];

function normalize(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

export function findFamilyFriendly(
  schoolName: string,
): FamilyFriendlyEntry | null {
  const name = normalize(schoolName);
  for (const entry of FAMILY_FRIENDLY_SCHOOLS) {
    if (name.includes(normalize(entry.match))) return entry;
  }
  return null;
}
