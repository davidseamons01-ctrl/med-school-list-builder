import { kv } from "@vercel/kv";

type MedianSnapshot = {
  medianMcat: number | null;
  medianCgpa: number | null;
  tuitionResident: number | null;
  tuitionNonResident: number | null;
};

const memoryCache = new Map<string, MedianSnapshot>();
const KV_TTL_SECONDS = 60 * 60 * 24;

function hasKvCredentials() {
  return Boolean(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);
}

export async function getCachedMedianSnapshot(
  schoolId: string,
  loader: () => MedianSnapshot,
): Promise<MedianSnapshot> {
  const key = `school:median:${schoolId}`;
  if (!hasKvCredentials()) {
    const inMemory = memoryCache.get(key);
    if (inMemory) return inMemory;
    const fresh = loader();
    memoryCache.set(key, fresh);
    return fresh;
  }

  const cached = await kv.get<MedianSnapshot>(key);
  if (cached) return cached;

  const fresh = loader();
  await kv.set(key, fresh, { ex: KV_TTL_SECONDS });
  return fresh;
}
