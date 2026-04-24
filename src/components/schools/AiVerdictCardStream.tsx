import { headers } from "next/headers";
import { z } from "zod";

type Props = {
  missionTagNotes: string | null;
  personalStatement: string;
  activities: Array<{
    title: string;
    description: string;
    isMostMeaningful: boolean;
    hours: number;
  }>;
  facts: Array<{
    key: string;
    valueJson: string;
    label: string;
  }>;
};

const resultSchema = z.object({
  alignmentScore: z.number(),
  vibeCheck: z.string(),
  whyUsDraft: z.array(z.string()),
  yieldProtectWarning: z.boolean(),
});

export async function AiVerdictCardStream({
  missionTagNotes,
  personalStatement,
  activities,
  facts,
}: Props) {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? "http";
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? `${proto}://${host}`;

  let result = {
    alignmentScore: 0,
    vibeCheck: "AI verdict unavailable right now. Please refresh in a moment.",
    whyUsDraft: [] as string[],
    yieldProtectWarning: false,
  };

  try {
    const response = await fetch(`${baseUrl}/api/analyze-fit`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      cache: "no-store",
      body: JSON.stringify({
        personalStatement,
        activities,
        missionTagNotes: missionTagNotes ?? "",
        facts,
      }),
    });
    const payload = (await response.json()) as unknown;
    const parsed = resultSchema.safeParse(payload);
    if (parsed.success) {
      result = parsed.data;
    }
  } catch {
    // fallback already set
  }

  return (
    <section className="surface rounded-[1.6rem] p-5">
      <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-300">AI Verdict</h3>
      <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/50 p-4">
        <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Mission Alignment Score</p>
        <p className="mt-2 text-3xl font-semibold text-white">{result.alignmentScore}/100</p>
      </div>
      <p className="mt-4 text-sm leading-7 text-slate-300">{result.vibeCheck}</p>
      <div className="mt-4">
        <p className="text-sm font-medium text-white">Draft Why Us? bullets</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-slate-300">
          {result.whyUsDraft.map((bullet) => (
            <li key={bullet}>{bullet}</li>
          ))}
        </ul>
      </div>
      {result.yieldProtectWarning ? (
        <div className="mt-4 rounded-xl border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-xs font-semibold text-amber-200">
          Yield protection risk detected for this profile-school pairing.
        </div>
      ) : null}
    </section>
  );
}

