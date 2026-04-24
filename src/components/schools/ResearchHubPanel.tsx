import { ExternalLink } from "lucide-react";
import type { ResearchSection } from "@/lib/research-hub";

export function ResearchHubPanel({ sections }: { sections: ResearchSection[] }) {
  return (
    <section className="surface rounded-[1.6rem] p-5">
      <div className="flex items-baseline justify-between gap-4">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">
            Research Hub
          </h3>
          <p className="mt-2 max-w-2xl text-sm text-slate-300">
            Every source your premed mentor would send you, pre-filtered for this
            school. No scraping that violates any site's terms — just deterministic
            deep links so you land on the right page in one click.
          </p>
        </div>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        {sections.map((section) => (
          <div
            key={section.id}
            className="rounded-2xl border border-white/10 bg-slate-950/50 p-4"
          >
            <h4 className="text-sm font-semibold text-white">{section.label}</h4>
            <p className="mt-1 text-xs leading-5 text-slate-400">{section.blurb}</p>
            <ul className="mt-3 space-y-2">
              {section.links.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="flex items-start gap-2 rounded-xl border border-white/5 bg-slate-900/70 px-3 py-2 text-sm text-slate-200 transition hover:border-cyan-400/40 hover:bg-cyan-400/5"
                  >
                    <ExternalLink className="mt-0.5 h-4 w-4 flex-none text-cyan-300" />
                    <span className="flex flex-col">
                      <span className="font-medium text-white">{link.title}</span>
                      <span className="text-xs text-slate-400">
                        {link.description}
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </section>
  );
}
