"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { formatCurrency } from "@/lib/format";

type MapSchool = {
  slug: string;
  name: string;
  city: string;
  state: string;
  control: string;
  lat: number | null;
  lng: number | null;
  score: number; // 0-100 holistic score
  annualCost: number | null;
  tier: string;
  campusImageUrl?: string | null;
};

type Props = {
  schools: MapSchool[];
  onVisibleSlugsChange?: (slugs: string[]) => void;
};

declare global {
  interface Window {
    require?: (
      modules: string[],
      callback: (...loaded: unknown[]) => void,
      errback?: (error: unknown) => void,
    ) => void;
  }
}

function markerColor(score: number) {
  if (score >= 75) return [34, 197, 94, 1]; // green
  if (score >= 55) return [245, 158, 11, 1]; // yellow
  return [244, 63, 94, 1]; // red
}

const GOOGLE_MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? "";

function streetViewImageUrl(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return "";
  if (!GOOGLE_MAPS_KEY) {
    // Fallback: OpenStreetMap static tile centered on the school; works
    // without any API key so the popup still shows a useful visual.
    return `https://staticmap.openstreetmap.de/staticmap.php?center=${lat},${lng}&zoom=16&size=600x300&maptype=mapnik&markers=${lat},${lng},red-pushpin`;
  }
  return `https://maps.googleapis.com/maps/api/streetview?size=600x300&location=${lat},${lng}&fov=85&pitch=0&key=${GOOGLE_MAPS_KEY}`;
}

function streetViewInteractiveUrl(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return "#";
  return `https://www.google.com/maps/@${lat},${lng},3a,75y,90h,90t/data=!3m6!1e1`;
}

function googleEarthUrl(lat: number | null, lng: number | null) {
  if (lat == null || lng == null) return "#";
  return `https://earth.google.com/web/@${lat},${lng},500a,0d,35y,0h,45t,0r`;
}

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 3958.8;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const PROVO = { lat: 40.2338, lng: -111.6585 };

export function SchoolMap({ schools, onVisibleSlugsChange }: Props) {
  const mapRef = useRef<HTMLDivElement | null>(null);
  const lastPublishedSlugsRef = useRef<string>("");
  const filteredForMapRef = useRef<MapSchool[]>([]);
  const [radiusEnabled, setRadiusEnabled] = useState(false);
  const [radiusMiles, setRadiusMiles] = useState(500);
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [basemap, setBasemap] = useState<"dark-gray-vector" | "satellite">("dark-gray-vector");

  const filteredSchools = useMemo(() => {
    if (!radiusEnabled || !center) return schools;
    return schools.filter((s) => {
      if (s.lat == null || s.lng == null) return false;
      return haversineMiles(center.lat, center.lng, s.lat, s.lng) <= radiusMiles;
    });
  }, [schools, radiusEnabled, center, radiusMiles]);
  const filteredSignature = useMemo(
    () =>
      filteredSchools
        .map((school) => `${school.slug}:${Math.round(school.score)}:${school.lat ?? "x"}:${school.lng ?? "x"}`)
        .join("|"),
    [filteredSchools],
  );
  const centerLat = center?.lat ?? null;
  const centerLng = center?.lng ?? null;

  useEffect(() => {
    filteredForMapRef.current = filteredSchools;
  }, [filteredSignature, filteredSchools]);

  useEffect(() => {
    const slugs = filteredSchools.map((s) => s.slug);
    const key = slugs.join("|");
    if (key === lastPublishedSlugsRef.current) return;
    lastPublishedSlugsRef.current = key;
    onVisibleSlugsChange?.(slugs);
  }, [filteredSchools, onVisibleSlugsChange]);

  useEffect(() => {
    const filteredForMap = filteredForMapRef.current;
    let view: { destroy?: () => void; on?: (...args: unknown[]) => { remove: () => void } } | undefined;
    let clickHandle: { remove: () => void } | undefined;
    let destroyed = false;

    function boot() {
      if (!mapRef.current || !window.require) {
        return;
      }
      window.require(
        [
          "esri/Map",
          "esri/views/MapView",
          "esri/Graphic",
          "esri/layers/GraphicsLayer",
          "esri/geometry/Circle",
        ],
        (ArcGISMapRaw, MapViewRaw, GraphicRaw, GraphicsLayerRaw, CircleRaw) => {
          if (destroyed || !mapRef.current) return;
          const ArcGISMap = ArcGISMapRaw as new (input: Record<string, unknown>) => { destroy?: () => void };
          const MapView = MapViewRaw as new (input: Record<string, unknown>) => {
            destroy?: () => void;
            on?: (...args: unknown[]) => { remove: () => void };
          };
          const Graphic = GraphicRaw as new (input: Record<string, unknown>) => object;
          const GraphicsLayer = GraphicsLayerRaw as new () => {
            add: (graphic: object) => void;
            removeAll: () => void;
          };
          const Circle = CircleRaw as new (input: Record<string, unknown>) => object;

          const markerLayer = new GraphicsLayer();
          const radiusLayer = new GraphicsLayer();
          const map = new ArcGISMap({
            basemap,
            layers: [radiusLayer, markerLayer],
          });

          view = new MapView({
            container: mapRef.current,
            map,
            center: centerLat != null && centerLng != null ? [centerLng, centerLat] : [-96, 38],
            zoom: centerLat != null && centerLng != null ? 6 : 3,
            popup: {
              dockEnabled: true,
              dockOptions: { position: "bottom-right", breakpoint: false },
            },
            constraints: { minZoom: 2 },
          });
          if (view?.on) {
            view.on("layerview-create-error", () => {
              if (basemap === "satellite") {
                setBasemap("dark-gray-vector");
              }
            });
          }

          if (drawMode && view?.on) {
            clickHandle = view.on("click", (event: unknown) => {
              const ev = event as { mapPoint?: { latitude?: number; longitude?: number } };
              if (ev.mapPoint?.latitude && ev.mapPoint?.longitude) {
                setCenter({ lat: ev.mapPoint.latitude, lng: ev.mapPoint.longitude });
                setRadiusEnabled(true);
                setDrawMode(false);
              }
            });
          }

          markerLayer.removeAll();
          filteredForMap
            .filter((school) => school.lat != null && school.lng != null)
            .forEach((school) => {
              markerLayer.add(
                new Graphic({
                  geometry: {
                    type: "point",
                    longitude: school.lng!,
                    latitude: school.lat!,
                  },
                  attributes: {
                    name: school.name,
                    city: school.city,
                    state: school.state,
                    tier: school.tier,
                    score: `${Math.round(school.score)}%`,
                    cost: formatCurrency(school.annualCost),
                    slug: school.slug,
                    imageUrl: streetViewImageUrl(school.lat, school.lng),
                    streetViewUrl: streetViewInteractiveUrl(school.lat, school.lng),
                    earthUrl: googleEarthUrl(school.lat, school.lng),
                    detailUrl: `/schools/${school.slug}`,
                  },
                  symbol: {
                    type: "simple-marker",
                    color: markerColor(school.score),
                    size: 10,
                    outline: { color: [255, 255, 255, 0.9], width: 1.1 },
                  },
                  popupTemplate: {
                    title: "{name}",
                    content: `
                      <div style="max-width:320px;color:#e2e8f0;">
                        <img
                          src="{imageUrl}"
                          alt="Street view near {name}"
                          style="width:100%;height:160px;object-fit:cover;border-radius:10px;border:1px solid rgba(255,255,255,0.08);"
                          onerror="this.style.display='none'"
                        />
                        <div style="margin-top:10px;font-size:13px;line-height:1.5;">
                          <div><strong>{city}, {state}</strong></div>
                          <div>Tier: {tier}</div>
                          <div>Holistic fit: {score}</div>
                          <div>Annual cost: {cost}</div>
                        </div>
                        <div style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;">
                          <a href="{detailUrl}" style="flex:1 1 auto;background:#0ea5e9;color:white;text-decoration:none;padding:6px 10px;border-radius:8px;font-size:12px;text-align:center;">Open deep dive</a>
                          <a href="{streetViewUrl}" target="_blank" rel="noreferrer" style="flex:1 1 auto;background:rgba(255,255,255,0.08);color:#e2e8f0;text-decoration:none;padding:6px 10px;border-radius:8px;font-size:12px;text-align:center;border:1px solid rgba(255,255,255,0.1);">Street view</a>
                          <a href="{earthUrl}" target="_blank" rel="noreferrer" style="flex:1 1 auto;background:rgba(255,255,255,0.08);color:#e2e8f0;text-decoration:none;padding:6px 10px;border-radius:8px;font-size:12px;text-align:center;border:1px solid rgba(255,255,255,0.1);">Google Earth</a>
                        </div>
                      </div>
                    `,
                  },
                }),
              );
            });

          radiusLayer.removeAll();
          if (radiusEnabled && centerLat != null && centerLng != null) {
            radiusLayer.add(
              new Graphic({
                geometry: new Circle({
                  center: [centerLng, centerLat],
                  radius: radiusMiles,
                  radiusUnit: "miles",
                }),
                symbol: {
                  type: "simple-fill",
                  color: [34, 211, 238, 0.08],
                  outline: { color: [34, 211, 238, 0.8], width: 1.5 },
                },
              }),
            );
            radiusLayer.add(
              new Graphic({
                geometry: { type: "point", longitude: centerLng, latitude: centerLat },
                symbol: {
                  type: "simple-marker",
                  color: [34, 211, 238, 1],
                  size: 9,
                  outline: { color: [255, 255, 255, 0.9], width: 1.2 },
                },
              }),
            );
          }
        },
        () => {},
      );
    }

    const timer = window.setTimeout(boot, 0);
    return () => {
      window.clearTimeout(timer);
      destroyed = true;
      clickHandle?.remove();
      if (view?.destroy) view.destroy();
    };
  }, [filteredSignature, radiusEnabled, centerLat, centerLng, radiusMiles, drawMode, basemap]);

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-3 shadow-2xl">
      <div className="mb-3 space-y-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">
              ArcGIS Explorer
            </h2>
            <p className="mt-1 text-sm text-slate-400">
              Radius-filtered map · {filteredSchools.length} schools in view
            </p>
          </div>
          <Link
            href="/discover"
            className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300 hover:border-white/20 hover:text-white"
          >
            Open research tools
          </Link>
        </div>

        <div className="grid gap-2 md:grid-cols-[auto_auto_auto_auto_1fr_auto]">
          <div className="flex items-center gap-1 rounded-xl border border-white/10 px-2 py-1.5 text-xs text-slate-300">
            <button
              type="button"
              onClick={() => setBasemap("dark-gray-vector")}
              className={`rounded-md px-2 py-1 ${basemap === "dark-gray-vector" ? "bg-cyan-400/20 text-cyan-200" : ""}`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setBasemap("satellite")}
              className={`rounded-md px-2 py-1 ${basemap === "satellite" ? "bg-cyan-400/20 text-cyan-200" : ""}`}
            >
              Satellite
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              setCenter(PROVO);
              setRadiusMiles(500);
              setRadiusEnabled(true);
              setDrawMode(false);
            }}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-200"
          >
            Show 500mi from Provo
          </button>
          <button
            type="button"
            onClick={() => setDrawMode((v) => !v)}
            className={`rounded-xl border px-3 py-2 text-xs ${
              drawMode
                ? "border-cyan-400/40 bg-cyan-400/10 text-cyan-200"
                : "border-white/10 text-slate-200"
            }`}
          >
            {drawMode ? "Click map to set center..." : "Draw center point"}
          </button>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300">
            <input
              type="checkbox"
              checked={radiusEnabled}
              onChange={(e) => setRadiusEnabled(e.target.checked)}
              className="h-3.5 w-3.5"
            />
            Show my radius
          </label>
          <label className="flex items-center gap-2 rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300">
            Radius
            <input
              type="range"
              min={50}
              max={1500}
              step={25}
              value={radiusMiles}
              onChange={(e) => setRadiusMiles(Number(e.target.value))}
              className="w-full accent-cyan-400"
            />
            <span>{radiusMiles}mi</span>
          </label>
          <button
            type="button"
            onClick={() => {
              setRadiusEnabled(false);
              setCenter(null);
              setDrawMode(false);
            }}
            className="rounded-xl border border-white/10 px-3 py-2 text-xs text-slate-300"
          >
            Reset
          </button>
        </div>
      </div>
      <div ref={mapRef} className="h-[560px] overflow-hidden rounded-2xl" />
    </div>
  );
}

