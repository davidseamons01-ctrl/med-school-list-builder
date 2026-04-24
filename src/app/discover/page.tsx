import Link from "next/link";

const resources = [
  {
    title: "AAMC Tuition and Student Fees reports",
    description:
      "Public workbook source for tuition, fees, and health insurance costs by school and residency status.",
    href: "https://www.aamc.org/data-reports/reporting-tools/report/tuition-and-student-fees-reports",
  },
  {
    title: "WARS / SDN reference thread",
    description:
      "Community reference point for the WedgeDawg/WARS-style way of thinking about school list realism.",
    href: "https://forums.studentdoctor.net/threads/how-did-wars-work-for-you.1367421/",
  },
  {
    title: "Medical School HQ secondary prompts",
    description:
      "Use historical secondaries to infer what a school consistently emphasizes in mission and fit.",
    href: "https://medicalschoolhq.net/medical-school-secondary-application-essay-library/",
  },
  {
    title: "r/premed Sankey search",
    description: "Search applicant Sankey diagrams to see how profiles like yours played out across schools.",
    href: "https://www.reddit.com/r/premed/search/?q=sankey&restrict_sr=1",
  },
];

export default function DiscoverPage() {
  return (
    <div className="space-y-6">
      <section className="surface rounded-[2rem] p-8">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-cyan-300">Research tooling</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">
          The “go deeper” toolbox for data that does not belong in a fake scraped database.
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-7 text-slate-300">
          This page links the main public sources that shaped the seeded research scaffolding. The school-level pages
          already preload targeted links for each school; this page keeps the foundational references in one place.
        </p>
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        {resources.map((resource) => (
          <a
            key={resource.title}
            href={resource.href}
            className="surface rounded-[2rem] p-6 transition hover:border-cyan-400/20"
          >
            <h2 className="text-lg font-semibold text-white">{resource.title}</h2>
            <p className="mt-3 text-sm leading-7 text-slate-300">{resource.description}</p>
          </a>
        ))}
      </div>

      <section className="surface rounded-[2rem] p-8">
        <h2 className="text-lg font-semibold text-white">How to use this build well</h2>
        <ol className="mt-5 list-decimal space-y-3 pl-5 text-sm leading-7 text-slate-300">
          <li>Set your profile and household priorities first so the explorer reflects your actual life constraints.</li>
          <li>Use the ArcGIS explorer to narrow geography before you over-invest in school-by-school rabbit holes.</li>
          <li>Open the school research desk and verify missing official class profile or debt figures with the seeded official-search links.</li>
          <li>Save schools into tiers, then promote or demote them manually once you have enough context from housing, family, and student-voice links.</li>
        </ol>
        <p className="mt-5 text-sm text-slate-400">
          Prefer to start visually? Go back to the <Link href="/schools" className="text-cyan-300">explorer</Link>.
        </p>
      </section>
    </div>
  );
}

