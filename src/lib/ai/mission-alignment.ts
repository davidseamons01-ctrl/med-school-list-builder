import OpenAI from "openai";

export type MissionAlignmentInput = {
  schoolName: string;
  missionStatement: string;
  personalStatement: string;
  activities: string;
};

export type MissionAlignmentResult = {
  missionAlignmentScore: number;
  vibeCheck: string;
  whyUsBullets: string[];
  usedChunks: string[];
};

function safeTrim(input: string, maxChars: number) {
  return input.replace(/\s+/g, " ").trim().slice(0, maxChars);
}

function splitIntoChunks(text: string, maxChunkLen = 380): string[] {
  const clean = text.trim();
  if (!clean) return [];
  const sentences = clean.split(/(?<=[.!?])\s+/);
  const chunks: string[] = [];
  let buffer = "";
  for (const sentence of sentences) {
    if ((buffer + " " + sentence).trim().length > maxChunkLen) {
      if (buffer.trim().length > 0) chunks.push(buffer.trim());
      buffer = sentence;
    } else {
      buffer = `${buffer} ${sentence}`.trim();
    }
  }
  if (buffer.trim().length > 0) chunks.push(buffer.trim());
  return chunks;
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  if (magA === 0 || magB === 0) return 0;
  return dot / (Math.sqrt(magA) * Math.sqrt(magB));
}

export function missionAlignmentFallback(reason: string): MissionAlignmentResult {
  return {
    missionAlignmentScore: 0,
    vibeCheck: `AI unavailable: ${reason}. Please retry in a moment. The page remains stable.`,
    whyUsBullets: [],
    usedChunks: [],
  };
}

export async function generateMissionAlignment(
  payload: MissionAlignmentInput,
): Promise<MissionAlignmentResult> {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return missionAlignmentFallback("missing OPENAI_API_KEY");

  const client = new OpenAI({ apiKey: key });
  const mission = safeTrim(payload.missionStatement, 3500);
  const sourceText = `${payload.personalStatement}\n\n${payload.activities}`;
  const chunks = splitIntoChunks(sourceText).slice(0, 20);

  if (chunks.length === 0) {
    return {
      missionAlignmentScore: 0,
      vibeCheck: "Insufficient activity and personal statement content for alignment analysis.",
      whyUsBullets: [],
      usedChunks: [],
    };
  }

  const embedModel = "text-embedding-3-small";
  const missionEmbedding = await client.embeddings.create({
    model: embedModel,
    input: mission,
  });
  const chunkEmbeddings = await client.embeddings.create({
    model: embedModel,
    input: chunks,
  });
  const missionVector = missionEmbedding.data[0]?.embedding ?? [];
  const rankedChunks = chunkEmbeddings.data
    .map((row, index) => ({
      chunk: chunks[index],
      score: cosineSimilarity(missionVector, row.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map((row) => row.chunk);

  const completion = await client.chat.completions.create({
    model: "gpt-4o-mini",
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content:
          "You are a medical school admissions strategy assistant. Return strict JSON with keys: missionAlignmentScore (0-100 number), vibeCheck (exactly 3 sentences), whyUsBullets (array of 3 concise bullets).",
      },
      {
        role: "user",
        content: JSON.stringify({
          schoolName: payload.schoolName,
          missionStatement: mission,
          retrievedApplicantChunks: rankedChunks,
          instruction:
            "Compare mission statement against applicant text chunks only. Provide realistic signal, avoid overclaiming.",
        }),
      },
    ],
  });

  const raw = completion.choices[0]?.message?.content ?? "{}";
  const parsed = JSON.parse(raw) as {
    missionAlignmentScore?: number;
    vibeCheck?: string;
    whyUsBullets?: string[];
  };

  return {
    missionAlignmentScore: Math.max(0, Math.min(100, Number(parsed.missionAlignmentScore ?? 0))),
    vibeCheck: String(parsed.vibeCheck ?? "No vibe check available."),
    whyUsBullets: Array.isArray(parsed.whyUsBullets)
      ? parsed.whyUsBullets.map((item) => String(item)).slice(0, 5)
      : [],
    usedChunks: rankedChunks,
  };
}

