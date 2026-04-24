import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import {
  generateApplicantAiProfile,
  type GenerateInput,
} from "@/lib/ai/applicant-profile";

const requestSchema = z.object({
  stats: z.object({
    mcat: z.number(),
    cgpa: z.number(),
    sgpa: z.number().optional().nullable(),
    residencyState: z.string().default(""),
    specialtyInterest: z.string().default(""),
  }),
  demographics: z.object({
    isMarried: z.boolean().default(false),
    householdChildren: z.number().default(0),
    strongTiesStates: z.array(z.string()).default([]),
  }),
  activities: z
    .array(
      z.object({
        title: z.string().default(""),
        description: z.string().default(""),
        isMostMeaningful: z.boolean().optional(),
        hours: z.number().optional(),
      }),
    )
    .default([]),
  personalStatement: z.string().default(""),
  missionTags: z.array(z.string()).default([]),
  dealbreakers: z.array(z.string()).default([]),
});

async function getActiveProfile() {
  const session = await getServerSession(authOptions);
  const sessionUserId = session?.user?.id;
  if (sessionUserId) {
    const owned = await prisma.applicantProfile.findFirst({
      where: { userId: sessionUserId },
      orderBy: { createdAt: "asc" },
    });
    if (owned) return owned;
  }
  return prisma.applicantProfile.findFirst({
    where: {},
    orderBy: { createdAt: "asc" },
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return NextResponse.json(
      {
        error: "missing_anthropic_api_key",
        message:
          "Set ANTHROPIC_API_KEY in your Vercel project environment variables, then retry.",
      },
      { status: 500 },
    );
  }

  const profile = await getActiveProfile();
  if (!profile) {
    return NextResponse.json(
      { error: "no_profile", message: "No applicant profile found. Complete onboarding first." },
      { status: 404 },
    );
  }

  const input: GenerateInput = parsed.data;

  let generated: Awaited<ReturnType<typeof generateApplicantAiProfile>>;
  try {
    generated = await generateApplicantAiProfile(input);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Anthropic call failed";
    return NextResponse.json({ error: "anthropic_failure", message }, { status: 502 });
  }

  const { data, rawResponse, model, promptVersion, sourceFingerprint } = generated;

  const saved = await prisma.applicantAiProfile.upsert({
    where: { profileId: profile.id },
    create: {
      profileId: profile.id,
      academicStrength: Math.round(data.academicStrength),
      clinicalDepth: Math.round(data.clinicalDepth),
      researchReadiness: Math.round(data.researchReadiness),
      serviceOrientation: Math.round(data.serviceOrientation),
      leadershipImpact: Math.round(data.leadershipImpact),
      narrativeCoherence: Math.round(data.narrativeCoherence),
      missionThemesJson: JSON.stringify(data.missionThemes),
      archetypesJson: JSON.stringify(data.archetypes),
      strengthsJson: JSON.stringify(data.strengths),
      gapsJson: JSON.stringify(data.gaps),
      redFlagsJson: JSON.stringify(data.redFlags),
      narrativeSummary: data.narrativeSummary,
      model,
      promptVersion,
      sourceFingerprint,
      rawResponseJson: rawResponse,
    },
    update: {
      academicStrength: Math.round(data.academicStrength),
      clinicalDepth: Math.round(data.clinicalDepth),
      researchReadiness: Math.round(data.researchReadiness),
      serviceOrientation: Math.round(data.serviceOrientation),
      leadershipImpact: Math.round(data.leadershipImpact),
      narrativeCoherence: Math.round(data.narrativeCoherence),
      missionThemesJson: JSON.stringify(data.missionThemes),
      archetypesJson: JSON.stringify(data.archetypes),
      strengthsJson: JSON.stringify(data.strengths),
      gapsJson: JSON.stringify(data.gaps),
      redFlagsJson: JSON.stringify(data.redFlags),
      narrativeSummary: data.narrativeSummary,
      model,
      promptVersion,
      sourceFingerprint,
      rawResponseJson: rawResponse,
    },
  });

  return NextResponse.json({
    ok: true,
    profileId: saved.profileId,
    generatedAt: saved.generatedAt.toISOString(),
    data,
  });
}

export async function GET() {
  const profile = await getActiveProfile();
  if (!profile) {
    return NextResponse.json({ ok: false, error: "no_profile" }, { status: 404 });
  }
  const ai = await prisma.applicantAiProfile.findUnique({
    where: { profileId: profile.id },
  });
  if (!ai) {
    return NextResponse.json({ ok: true, ai: null });
  }
  return NextResponse.json({
    ok: true,
    ai: {
      id: ai.id,
      profileId: ai.profileId,
      generatedAt: ai.generatedAt.toISOString(),
      updatedAt: ai.updatedAt.toISOString(),
      model: ai.model,
      promptVersion: ai.promptVersion,
      sourceFingerprint: ai.sourceFingerprint,
      academicStrength: ai.academicStrength,
      clinicalDepth: ai.clinicalDepth,
      researchReadiness: ai.researchReadiness,
      serviceOrientation: ai.serviceOrientation,
      leadershipImpact: ai.leadershipImpact,
      narrativeCoherence: ai.narrativeCoherence,
      missionThemes: JSON.parse(ai.missionThemesJson) as Array<{ theme: string; weight: number }>,
      archetypes: JSON.parse(ai.archetypesJson) as string[],
      strengths: JSON.parse(ai.strengthsJson) as string[],
      gaps: JSON.parse(ai.gapsJson) as string[],
      redFlags: JSON.parse(ai.redFlagsJson) as string[],
      narrativeSummary: ai.narrativeSummary,
    },
  });
}
