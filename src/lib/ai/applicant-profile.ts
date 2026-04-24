import { z } from "zod";
import { createHash } from "node:crypto";
import {
  DEFAULT_ANTHROPIC_MODEL,
  extractJsonObject,
  extractTextFromResponse,
  getAnthropicClient,
} from "./anthropic";
import { MISSION_THEMES, type MissionTheme } from "./mission-themes";

export const APPLICANT_PROFILE_PROMPT_VERSION = "v1";

export const applicantAiProfileSchema = z.object({
  academicStrength: z.number().min(0).max(100),
  clinicalDepth: z.number().min(0).max(100),
  researchReadiness: z.number().min(0).max(100),
  serviceOrientation: z.number().min(0).max(100),
  leadershipImpact: z.number().min(0).max(100),
  narrativeCoherence: z.number().min(0).max(100),
  missionThemes: z
    .array(
      z.object({
        theme: z.enum(MISSION_THEMES),
        weight: z.number().min(0).max(1),
      }),
    )
    .max(12),
  archetypes: z.array(z.string()).max(6),
  strengths: z.array(z.string()).max(8),
  gaps: z.array(z.string()).max(8),
  redFlags: z.array(z.string()).max(6).default([]),
  narrativeSummary: z.string(),
});

export type ApplicantAiProfileData = z.infer<typeof applicantAiProfileSchema>;

export type GenerateInput = {
  stats: {
    mcat: number;
    cgpa: number;
    sgpa?: number | null;
    residencyState: string;
    specialtyInterest: string;
  };
  demographics: {
    isMarried: boolean;
    householdChildren: number;
    strongTiesStates?: string[];
  };
  activities: Array<{
    title: string;
    description: string;
    isMostMeaningful?: boolean;
    hours?: number;
  }>;
  personalStatement: string;
  missionTags: string[];
  dealbreakers: string[];
};

function buildSourceFingerprint(input: GenerateInput): string {
  const h = createHash("sha256");
  h.update(JSON.stringify(input));
  return h.digest("hex").slice(0, 16);
}

const SYSTEM_PROMPT = `You are an experienced medical school admissions strategist who has reviewed thousands of applications. Your task is to distill a single applicant's holistic profile into a small structured JSON so a downstream deterministic fit engine can score every US MD school without further AI calls.

You MUST reply with ONLY a single JSON object (no markdown fences, no prose outside the object). The JSON must conform exactly to this shape:

{
  "academicStrength": number 0-100,
  "clinicalDepth": number 0-100,
  "researchReadiness": number 0-100,
  "serviceOrientation": number 0-100,
  "leadershipImpact": number 0-100,
  "narrativeCoherence": number 0-100,
  "missionThemes": [ { "theme": one of ["primary_care","rural","urban_underserved","research","academic_medicine","health_equity","community_engagement","global_health","service","military","innovation_tech","leadership","family_medicine","psychiatry_mental_health","pediatrics"], "weight": number 0-1 } ],
  "archetypes": [ short string, up to 6 ],
  "strengths": [ short string, up to 8 ],
  "gaps": [ short string, up to 8 ],
  "redFlags": [ short string, up to 6 ],
  "narrativeSummary": 2-3 sentences
}

SCORING RUBRIC — be honest, calibrated, and avoid clustering everyone in the 60-80 band.

- academicStrength: use MCAT and cGPA against the national applicant pool. 90th percentile MCAT (~515) is ~75. 99th percentile (~523) is ~95. A 508 MCAT with 3.7 GPA is ~55. Sub-median (<506 / <3.6) should be 35-45.
- clinicalDepth: weight scribe, MA, RBT, EMT, CNA, and unique patient-contact roles. 1,000+ hours meaningful hands-on = 85+. 150 hours of basic shadowing = 35.
- researchReadiness: peer-reviewed pubs, posters, lab PI named, independent project = 80-95. Course-based research only = 30-45.
- serviceOrientation: sustained, non-clinical service to non-affluent or specific underserved groups. Tourism-style short trips get partial credit.
- leadershipImpact: founded, led, or meaningfully grew something. Officer titles without impact = 40-50.
- narrativeCoherence: does the personal statement make the activities click together? Is there a clear, believable "why medicine" arc? Score 85+ only for strong, cohesive arcs.

MISSION THEMES — pick 3 to 8 themes that actually describe THIS applicant. Weights should sum to roughly 1.0 across the chosen themes. Do NOT select themes you cannot defend from the personal statement + activities. An applicant with zero rural ties should not be tagged "rural".

REDFLAGS — grade inflation concerns, committee letter red flags, patterns of quitting commitments, ethical concerns, impulsive specialty fixation, etc. Leave empty if none.

Be brutally honest but professional. Your output drives real application-list decisions.`;

export async function generateApplicantAiProfile(
  input: GenerateInput,
): Promise<{
  data: ApplicantAiProfileData;
  rawResponse: string;
  model: string;
  promptVersion: string;
  sourceFingerprint: string;
}> {
  const client = getAnthropicClient();
  if (!client) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const sourceFingerprint = buildSourceFingerprint(input);

  const userPayload = {
    stats: input.stats,
    demographics: input.demographics,
    activities: input.activities.slice(0, 20).map((activity) => ({
      title: activity.title,
      description: activity.description.slice(0, 800),
      isMostMeaningful: Boolean(activity.isMostMeaningful),
      hours: Number(activity.hours ?? 0),
    })),
    personalStatement: input.personalStatement.slice(0, 6000),
    missionTags: input.missionTags,
    dealbreakers: input.dealbreakers,
    task: "Produce the structured applicant profile JSON exactly as specified in the system prompt.",
  };

  const response = await client.messages.create({
    model: DEFAULT_ANTHROPIC_MODEL,
    max_tokens: 2000,
    temperature: 0.2,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: JSON.stringify(userPayload),
      },
    ],
  });

  const rawResponse = extractTextFromResponse(response);
  const parsedUnknown = extractJsonObject(rawResponse);
  const parsed = applicantAiProfileSchema.safeParse(parsedUnknown);
  if (!parsed.success) {
    throw new Error(
      `Claude returned invalid JSON: ${parsed.error.message}. Raw: ${rawResponse.slice(0, 400)}`,
    );
  }

  return {
    data: parsed.data,
    rawResponse,
    model: DEFAULT_ANTHROPIC_MODEL,
    promptVersion: APPLICANT_PROFILE_PROMPT_VERSION,
    sourceFingerprint,
  };
}

export function themesToWeights(
  themes: ApplicantAiProfileData["missionThemes"],
): Partial<Record<MissionTheme, number>> {
  const result: Partial<Record<MissionTheme, number>> = {};
  for (const { theme, weight } of themes) {
    result[theme] = Math.max(result[theme] ?? 0, weight);
  }
  return result;
}
