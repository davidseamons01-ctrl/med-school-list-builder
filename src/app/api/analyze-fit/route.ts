import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import {
  DEFAULT_ANTHROPIC_MODEL,
  extractJsonObject,
  extractTextFromResponse,
  getAnthropicClient,
} from "@/lib/ai/anthropic";

const requestSchema = z.object({
  personalStatement: z.string().min(1),
  activities: z.array(
    z.object({
      title: z.string().default(""),
      description: z.string().default(""),
      isMostMeaningful: z.boolean().optional(),
      hours: z.number().optional(),
    }),
  ),
  missionTagNotes: z.string().default(""),
  facts: z.array(
    z.object({
      key: z.string(),
      valueJson: z.string().optional(),
      label: z.string().optional(),
    }),
  ),
});

const responseSchema = z.object({
  alignmentScore: z.number().min(0).max(100),
  vibeCheck: z.string(),
  whyUsDraft: z.array(z.string()),
  yieldProtectWarning: z.boolean(),
});

function safeJsonParse(input: string) {
  try {
    return JSON.parse(input) as unknown;
  } catch {
    return null;
  }
}

function getMcatFromFacts(facts: Array<{ key: string; valueJson?: string; label?: string }>) {
  const mcatFact = facts.find((fact) => fact.key.toLowerCase().includes("mcat"));
  if (!mcatFact?.valueJson) return null;
  try {
    const parsed = JSON.parse(mcatFact.valueJson);
    if (typeof parsed === "number" && Number.isFinite(parsed)) return parsed;
    if (typeof parsed === "string") {
      const asNum = Number(parsed);
      return Number.isFinite(asNum) ? asNum : null;
    }
    return null;
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsedRequest = requestSchema.safeParse(body);
  if (!parsedRequest.success) {
    return NextResponse.json({ error: "invalid_request", details: parsedRequest.error.flatten() }, { status: 400 });
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!anthropicKey && !openaiKey) {
    return NextResponse.json(
      { error: "missing_llm_api_key", message: "Set either ANTHROPIC_API_KEY or OPENAI_API_KEY." },
      { status: 500 },
    );
  }

  const { personalStatement, activities, missionTagNotes, facts } = parsedRequest.data;

  const activitySummary = activities
    .map((activity) => {
      const marker = activity.isMostMeaningful ? "MOST_MEANINGFUL" : "ACTIVITY";
      return `${marker}: ${activity.title} | ${activity.description} | hours=${activity.hours ?? 0}`;
    })
    .join("\n")
    .slice(0, 7000);

  const schoolMedianMcat = getMcatFromFacts(facts);
  const systemPrompt =
    "You are an admissions strategy analyst for U.S. MD schools. Return ONLY valid JSON with exactly these keys: alignmentScore, vibeCheck, whyUsDraft, yieldProtectWarning. " +
    "alignmentScore must be a number from 0 to 100. vibeCheck must be exactly 3 sentences and brutally honest but professional. " +
    "whyUsDraft must be an array of exactly 3 concise, personalized bullet strings that can be dropped into a secondary essay. " +
    "yieldProtectWarning must be true if the applicant MCAT is above 99th percentile (>=523) and the school appears mid-tier by context; otherwise false. " +
    "Do not add any extra keys, markdown, code fences, or commentary.";
  const userPayload = {
    applicant: {
      personalStatement,
      activities: activitySummary,
    },
    school: {
      missionTagNotes,
      facts,
      inferredSchoolMedianMcat: schoolMedianMcat,
    },
    task:
      "Assess mission fit quality, produce a candid vibe check, draft three specific 'Why Us' bullets, and compute yield protection warning using the stated rule.",
  };

  let raw = "{}";
  const anthropic = getAnthropicClient();
  if (anthropic) {
    const message = await anthropic.messages.create({
      model: DEFAULT_ANTHROPIC_MODEL,
      max_tokens: 1200,
      temperature: 0.2,
      system: systemPrompt,
      messages: [{ role: "user", content: JSON.stringify(userPayload) }],
    });
    raw = extractTextFromResponse(message);
  } else if (openaiKey) {
    const client = new OpenAI({ apiKey: openaiKey });
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: JSON.stringify(userPayload) },
      ],
    });
    raw = completion.choices[0]?.message?.content ?? "{}";
  }

  const maybeJson = anthropic ? extractJsonObject(raw) : safeJsonParse(raw);
  const parsedResponse = responseSchema.safeParse(maybeJson);

  if (!parsedResponse.success) {
    return NextResponse.json(
      {
        error: "invalid_model_response",
        raw,
      },
      { status: 502 },
    );
  }

  const normalized = {
    alignmentScore: Math.max(0, Math.min(100, parsedResponse.data.alignmentScore)),
    vibeCheck: parsedResponse.data.vibeCheck,
    whyUsDraft: parsedResponse.data.whyUsDraft.slice(0, 3),
    yieldProtectWarning: parsedResponse.data.yieldProtectWarning,
  };

  return NextResponse.json(normalized);
}
