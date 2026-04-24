import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";

export const runtime = "nodejs";
export const maxDuration = 60;

const requestSchema = z.object({
  slug: z.string(),
});

async function authorized(req: Request): Promise<boolean> {
  if (process.env.CRON_SECRET) {
    const header = req.headers.get("authorization") ?? "";
    if (header === `Bearer ${process.env.CRON_SECRET}`) return true;
  } else {
    return true;
  }
  const session = await getServerSession(authOptions);
  return Boolean(session?.user);
}

const UA = "MedSchoolListBuilder/1.0 (contact: support@example.com)";

type NominatimHit = {
  lat: string;
  lon: string;
  display_name: string;
  class?: string;
  type?: string;
  importance?: number;
};

async function nominatim(query: string): Promise<NominatimHit | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&addressdetails=0&countrycodes=us&q=${encodeURIComponent(
    query,
  )}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "application/json" },
    cache: "no-store",
  });
  if (!res.ok) return null;
  const data = (await res.json()) as NominatimHit[];
  return data?.[0] ?? null;
}

async function geocodeCampus(
  name: string,
  city: string,
  state: string,
): Promise<{ lat: number; lng: number; match: string } | null> {
  // Try most-specific queries first so we land on the actual school building
  // rather than the city centroid.
  const queries = [
    `${name}`,
    `${name}, ${city}, ${state}`,
    `${name} ${city} ${state}`,
    `${name.replace(/^The /i, "")}, ${city}, ${state}`,
  ];
  for (const q of queries) {
    const hit = await nominatim(q);
    if (hit) {
      const lat = Number(hit.lat);
      const lng = Number(hit.lon);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng, match: q };
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }
  return null;
}

type WikipediaSummary = {
  thumbnail?: { source: string; width: number; height: number };
  originalimage?: { source: string };
  title?: string;
  type?: string;
};

async function wikipediaCampusImage(name: string): Promise<string | null> {
  const candidates = [
    name,
    name.replace(/^The /i, ""),
    `${name} (medical school)`,
  ];
  for (const title of candidates) {
    const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(
      title.replace(/ /g, "_"),
    )}`;
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": UA, Accept: "application/json" },
        cache: "no-store",
      });
      if (!res.ok) continue;
      const data = (await res.json()) as WikipediaSummary;
      const src = data.originalimage?.source ?? data.thumbnail?.source;
      if (src) return src;
    } catch {
      // try next candidate
    }
  }
  return null;
}

export async function POST(req: Request) {
  if (!(await authorized(req))) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  const body = await req.json().catch(() => null);
  const parsed = requestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  const school = await prisma.school.findUnique({
    where: { slug: parsed.data.slug },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      lat: true,
      lng: true,
      campusImageUrl: true,
    },
  });
  if (!school) {
    return NextResponse.json({ error: "school_not_found" }, { status: 404 });
  }

  const geocoded = await geocodeCampus(school.name, school.city, school.state);
  const image = school.campusImageUrl
    ? school.campusImageUrl
    : await wikipediaCampusImage(school.name);

  await prisma.school.update({
    where: { id: school.id },
    data: {
      lat: geocoded?.lat ?? school.lat,
      lng: geocoded?.lng ?? school.lng,
      campusImageUrl: image ?? school.campusImageUrl,
      campusGeocodedAt: new Date(),
    },
  });

  return NextResponse.json({
    ok: true,
    slug: parsed.data.slug,
    lat: geocoded?.lat ?? school.lat,
    lng: geocoded?.lng ?? school.lng,
    matchedWith: geocoded?.match ?? null,
    image: image ?? null,
  });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const listMissing = url.searchParams.get("listMissing") === "true";
  const totalSchools = await prisma.school.count();
  const geocoded = await prisma.school.count({
    where: { campusGeocodedAt: { not: null } },
  });
  const missingCount = totalSchools - geocoded;

  if (!listMissing) {
    return NextResponse.json({ totalSchools, geocoded, missingCount });
  }

  const missing = await prisma.school.findMany({
    where: { campusGeocodedAt: null },
    select: { slug: true, name: true, state: true },
    orderBy: [{ state: "asc" }, { name: "asc" }],
  });

  return NextResponse.json({ totalSchools, geocoded, missingCount, missing });
}
