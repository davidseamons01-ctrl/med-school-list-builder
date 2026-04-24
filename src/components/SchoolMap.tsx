"use client";

import { useEffect, useRef } from "react";
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
  score: number;
  annualCost: number | null;
  tier: string;
};

function markerColor(score: number) {
  if (score >= 0.75) return [34, 197, 94, 1];
  if (score >= 0.6) return [14, 165, 233, 1];
  if (score >= 0.45) return [245, 158, 11, 1];
  return [244, 63, 94, 1];
}

declare global {
  interface Window {
    require?: (
      modules: string[],
      callback: (...loaded: unknown[]) => void,
      errback?: (error: unknown) => void,
    ) => void;
  }
}

export function SchoolMap({ schools }: { schools: MapSchool[] }) {
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let view: { destroy?: () => void } | undefined;
    let destroyed = false;

    function boot() {
      if (!mapRef.current || !window.require) return;
      window.require(
        ["esri/Map", "esri/views/MapView", "esri/Graphic", "esri/layers/GraphicsLayer"],
        (ArcGISMapRaw, MapViewRaw, GraphicRaw, GraphicsLayerRaw) => {
          if (destroyed || !mapRef.current) return;
          const ArcGISMap = ArcGISMapRaw as new (input: Record<string, unknown>) => { destroy?: () => void };
          const MapView = MapViewRaw as new (input: Record<string, unknown>) => { destroy?: () => void };
          const Graphic = GraphicRaw as new (input: Record<string, unknown>) => object;
          const GraphicsLayer = GraphicsLayerRaw as new () => {
            add: (graphic: object) => void;
          };

          const graphicsLayer = new GraphicsLayer();
          const map = new ArcGISMap({
            basemap: "dark-gray-vector",
            layers: [graphicsLayer],
          });

          view = new MapView({
            container: mapRef.current,
            map,
            center: [-96, 38],
            zoom: 3,
            popup: {
              dockEnabled: true,
              dockOptions: { position: "bottom-right", breakpoint: false },
            },
            constraints: {
              minZoom: 2,
            },
          });

          schools
            .filter((school) => school.lat != null && school.lng != null)
            .forEach((school) => {
              const color = markerColor(school.score);
              graphicsLayer.add(
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
                    score: `${Math.round(school.score * 100)}%`,
                    cost: formatCurrency(school.annualCost),
                  },
                  symbol: {
                    type: "simple-marker",
                    color,
                    size: 10,
                    outline: {
                      color: [255, 255, 255, 0.9],
                      width: 1.2,
                    },
                  },
                  popupTemplate: {
                    title: "{name}",
                    content:
                      "<div><strong>{city}, {state}</strong><br/>Tier: {tier}<br/>Fit score: {score}<br/>Annual cost: {cost}</div>",
                  },
                }),
              );
            });
        },
      );
    }

    const timer = window.setTimeout(boot, 0);
    return () => {
      window.clearTimeout(timer);
      destroyed = true;
      if (view?.destroy) view.destroy();
    };
  }, [schools]);

  return (
    <div className="rounded-3xl border border-white/10 bg-slate-900/70 p-3 shadow-2xl">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-200">ArcGIS Explorer</h2>
          <p className="mt-1 text-sm text-slate-400">
            Spatially compare fit, cost, and geography across the MD roster.
          </p>
        </div>
        <Link
          href="/discover"
          className="rounded-full border border-white/10 px-3 py-2 text-xs text-slate-300 hover:border-white/20 hover:text-white"
        >
          Open research tools
        </Link>
      </div>
      <div ref={mapRef} className="h-[520px] overflow-hidden rounded-2xl" />
    </div>
  );
}

