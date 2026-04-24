import { NextResponse } from "next/server";
import { checkRateLimit } from "@/lib/api/rate-limit";
import {
  generateMissionAlignment,
  missionAlignmentFallback,
} from "@/lib/ai/mission-alignment";

type RequestPayload = {
  schoolName: string;
  missionStatement: string;
  personalStatement: string;
  activities: string;
};

export async function POST(req: Request) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
  const gate = checkRateLimit({
    key: `mission-rag:${ip}`,
    windowMs: 60_000,
    maxRequests: 8,
  });
  if (!gate.allowed) {
    return NextResponse.json(
      { error: "rate_limit_exceeded", resetAt: gate.resetAt },
      { status: 429 },
    );
  }

  const body = (await req.json().catch(() => null)) as RequestPayload | null;
  if (!body || !body.schoolName || !body.missionStatement) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  try {
    const result = await generateMissionAlignment(body);
    return NextResponse.json(result);
  } catch (error) {
    console.error("mission alignment route failure", error);
    return NextResponse.json(missionAlignmentFallback("upstream model call failed"), { status: 200 });
  }
}

