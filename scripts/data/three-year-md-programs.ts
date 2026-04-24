/**
 * Curated list of U.S. MD programs that offer a publicly advertised 3-year
 * accelerated MD pathway. Matching is case-insensitive on school name;
 * keywords must all appear in the school name for a match (so "NYU Grossman"
 * matches "NYU Grossman School of Medicine" but not "NYU Long Island").
 *
 * Sources: each school's official program page (Consortium of Accelerated
 * Medical Pathway Programs / CAMPP, AAMC accelerated pathways roundup).
 */
export type ThreeYearProgramEntry = {
  matchKeywords: string[];
  trackLabel: string;
  sourceUrl: string;
};

export const THREE_YEAR_MD_PROGRAMS: ThreeYearProgramEntry[] = [
  {
    matchKeywords: ["NYU Grossman School of Medicine"],
    trackLabel: "NYU Grossman 3-Year MD Pathway",
    sourceUrl: "https://med.nyu.edu/education/md-degree/three-year-md-pathway",
  },
  {
    matchKeywords: ["NYU Grossman Long Island"],
    trackLabel: "NYU Long Island 3-Year Primary Care MD",
    sourceUrl: "https://med.nyu.edu/long-island-school-of-medicine",
  },
  {
    matchKeywords: ["Mercer University School of Medicine"],
    trackLabel: "Mercer Accelerated Primary Care Track (limited 3-year option)",
    sourceUrl: "https://medicine.mercer.edu/",
  },
  {
    matchKeywords: ["Louisiana State University School of Medicine in Shreveport"],
    trackLabel: "LSU Shreveport 3-Year Primary Care Track",
    sourceUrl: "https://www.lsuhs.edu/",
  },
  {
    matchKeywords: ["Texas Tech University Health Sciences Center School of Medicine"],
    trackLabel: "TTUHSC Family Medicine Accelerated Track (FMAT)",
    sourceUrl: "https://www.ttuhsc.edu/medicine/family-community/fmat/",
  },
  {
    matchKeywords: ["Paul L. Foster School of Medicine"],
    trackLabel: "TTUHSC El Paso Accelerated Track",
    sourceUrl: "https://elpaso.ttuhsc.edu/",
  },
  {
    matchKeywords: ["Penn State College of Medicine"],
    trackLabel: "Penn State Accelerated Pathway Program",
    sourceUrl: "https://med.psu.edu/",
  },
  {
    matchKeywords: ["Cooper Medical School of Rowan University"],
    trackLabel: "Cooper 3-Year Primary Care Program",
    sourceUrl: "https://cmsru.rowan.edu/",
  },
  {
    matchKeywords: ["Medical College of Wisconsin"],
    trackLabel: "MCW Central Wisconsin / Green Bay 3-Year Track",
    sourceUrl: "https://www.mcw.edu/education/medical-school",
  },
  {
    matchKeywords: ["University of California, Davis School of Medicine"],
    trackLabel: "UC Davis ACE-PC (3-year primary care)",
    sourceUrl: "https://health.ucdavis.edu/mdprogram/",
  },
  {
    matchKeywords: ["University of Iowa Roy J. and Lucille A. Carver College of Medicine"],
    trackLabel: "University of Iowa Accelerated Pathway (select tracks)",
    sourceUrl: "https://medicine.uiowa.edu/",
  },
  {
    matchKeywords: ["Columbia University Vagelos College of Physicians and Surgeons"],
    trackLabel: "Columbia VP&S Accelerated Research Track (3+1)",
    sourceUrl: "https://www.vagelos.columbia.edu/",
  },
  {
    matchKeywords: ["LSU Health Sciences Center School of Medicine in New Orleans"],
    trackLabel: "LSU New Orleans Accelerated Primary Care Option",
    sourceUrl: "https://www.medschool.lsuhsc.edu/",
  },
  {
    matchKeywords: ["University of North Dakota School of Medicine and Health Sciences"],
    trackLabel: "UND Rural / Accelerated MD Track",
    sourceUrl: "https://med.und.edu/",
  },
  {
    matchKeywords: ["University of South Dakota Sanford School of Medicine"],
    trackLabel: "USD FARM Accelerated Rural Track",
    sourceUrl: "https://www.usd.edu/medicine",
  },
];

function normalizeName(raw: string): string {
  return raw.toLowerCase().replace(/\s+/g, " ").trim();
}

export function findThreeYearProgram(
  schoolName: string,
): ThreeYearProgramEntry | null {
  const name = normalizeName(schoolName);
  for (const entry of THREE_YEAR_MD_PROGRAMS) {
    const allMatch = entry.matchKeywords.every((kw) =>
      name.includes(normalizeName(kw)),
    );
    if (allMatch) return entry;
  }
  return null;
}
