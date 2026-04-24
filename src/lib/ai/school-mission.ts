import { z } from "zod";
import { createHash } from "node:crypto";
import {
  DEFAULT_ANTHROPIC_MODEL,
  extractJsonObject,
  extractTextFromResponse,
  getAnthropicClient,
} from "./anthropic";
import { MISSION_THEMES } from "./mission-themes";

export const SCHOOL_MISSION_PROMPT_VERSION = "v1";

export const schoolAiMissionSchema = z.object({
  themes: z
    .array(
      z.object({
        theme: z.enum(MISSION_THEMES),
        weight: z.number().min(0).max(1),
      }),
    )
    .max(12),
  archetypes: z.array(z.string()).max(6),
  focusSummary: z.string().min(20).max(600),
  selectivityTier: z.enum(["T20", "Upper", "Mid", "Lower", "Unranked"]),
  researchIntensity: z.number().min(0).max(100),
  serviceIntensity: z.number().min(0).max(100),
  ruralOrientation: z.number().min(0).max(100),
  urbanUnderservedOrientation: z.number().min(0).max(100),
});

export type SchoolAiMissionData = z.infer<typeof schoolAiMissionSchema>;

export type GenerateSchoolInput = {
  name: string;
  city: string;
  state: string;
  control: string;
  missionTagNotes: string | null;
  residencyBiasNotes: string | null;
  oosFriendly: boolean | null;
  oosMatriculantPct: number | null;
  medianMcat: number | null;
  tuitionResident: number | null;
  tuitionNonResident: number | null;
  neighborhoodGrades: string[];
  hasLevel1Trauma: boolean;
  hasSafetyNet: boolean;
  hasVA: boolean;
};

export function buildSchoolSourceFingerprint(input: GenerateSchoolInput): string {
  const h = createHash("sha256");
  h.update(JSON.stringify(input));
  return h.digest("hex").slice(0, 16);
}

const SYSTEM_PROMPT = `You are an experienced US MD medical-school admissions strategist. Your task is to profile a single medical school by extracting its actual mission orientation and institutional character, so a downstream engine can match applicants to schools using deterministic vector math.

You MUST reply with ONLY a single JSON object (no markdown fences, no prose). Shape:

{
  "themes": [ { "theme": one of ["primary_care","rural","urban_underserved","research","academic_medicine","health_equity","community_engagement","global_health","service","military","innovation_tech","leadership","family_medicine","psychiatry_mental_health","pediatrics"], "weight": number 0-1 } ],
  "archetypes": [ short string, up to 6 ],
  "focusSummary": "2-3 sentence plain-English description of what this school actually cares about",
  "selectivityTier": one of ["T20","Upper","Mid","Lower","Unranked"],
  "researchIntensity": number 0-100,
  "serviceIntensity": number 0-100,
  "ruralOrientation": number 0-100,
  "urbanUnderservedOrientation": number 0-100
}

THEMES — pick 3 to 8 themes that genuinely describe THIS school. Use the mission text provided, institutional name, control type (public vs. private), state, and any affiliations as evidence. Weights should roughly sum to 1.0 across the chosen themes. DO NOT evenly split weights — privilege the 2-3 things a school actually emphasizes.

Calibration guidance — rely on your knowledge of US MD schools:
- T20 research powerhouses (Harvard, Hopkins, UCSF, Penn, Columbia, WashU, Duke, Mayo Clinic Alix, Stanford, etc.) → research weight 0.35-0.55, academic_medicine 0.15-0.25, innovation_tech 0.05-0.15. Selectivity T20. researchIntensity 90+.
- Mission-driven state publics with rural/primary care focus (East Carolina Brody, Marshall, Quillen ETSU, U. of South Dakota, Mercer, U. of North Dakota, etc.) → rural + primary_care + community_engagement dominant. researchIntensity 20-40. ruralOrientation 70+.
- Urban safety-net schools (Meharry, Morehouse, Howard, Drew) → urban_underserved + health_equity + service dominant. urbanUnderservedOrientation 85+.
- Texas publics → primary_care + community_engagement + rural (Texas A&M, Texas Tech) for certain campuses.
- Military: USUHS → military 0.5+, service 0.2+.

If the school's mission text is sparse or generic, still make a best-effort guess using the school's well-known reputation from your training data. Do not refuse. Do not default to evenly-weighted themes.

Be decisive. Applicants will use this to triage 160+ schools and your mediocre / hedged output makes the product useless.`;

export async function generateSchoolAiMission(
  input: GenerateSchoolInput,
): Promise<{
  data: SchoolAiMissionData;
  rawResponse: string;
  model: string;
  promptVersion: string;
  sourceFingerprint: string;
}> {
  const client = getAnthropicClient();
  if (!client) {
    throw new Error("ANTHROPIC_API_KEY is not configured");
  }

  const sourceFingerprint = buildSchoolSourceFingerprint(input);

  const userPayload = {
    school: {
      name: input.name,
      city: input.city,
      state: input.state,
      control: input.control,
      missionTagNotes: input.missionTagNotes,
      residencyBiasNotes: input.residencyBiasNotes,
      oosFriendly: input.oosFriendly,
      oosMatriculantPct: input.oosMatriculantPct,
      medianMcat: input.medianMcat,
      tuitionResident: input.tuitionResident,
      tuitionNonResident: input.tuitionNonResident,
      neighborhoodGrades: input.neighborhoodGrades,
      affiliations: {
        level1Trauma: input.hasLevel1Trauma,
        safetyNet: input.hasSafetyNet,
        va: input.hasVA,
      },
    },
    task: "Produce the structured school mission JSON exactly as specified.",
  };

  const response = await client.messages.create({
    model: DEFAULT_ANTHROPIC_MODEL,
    max_tokens: 1200,
    temperature: 0.2,
    system: SYSTEM_PROMPT,
    messages: [
      { role: "user", content: JSON.stringify(userPayload) },
    ],
  });

  const rawResponse = extractTextFromResponse(response);
  const parsedUnknown = extractJsonObject(rawResponse);
  const parsed = schoolAiMissionSchema.safeParse(parsedUnknown);
  if (!parsed.success) {
    throw new Error(
      `Claude returned invalid JSON for ${input.name}: ${parsed.error.message}. Raw: ${rawResponse.slice(0, 400)}`,
    );
  }

  return {
    data: parsed.data,
    rawResponse,
    model: DEFAULT_ANTHROPIC_MODEL,
    promptVersion: SCHOOL_MISSION_PROMPT_VERSION,
    sourceFingerprint,
  };
}
