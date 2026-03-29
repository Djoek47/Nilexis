"use client";

import type { GlobeMethods } from "react-globe.gl";
import { useEffect, useMemo, useRef, useState } from "react";
import Globe from "react-globe.gl";
import SunCalc from "suncalc";

export type GlobePin = {
  lat: number;
  lng: number;
  label: string;
  color?: string;
};

export default function LexisGlobeInner({ pins }: { pins: GlobePin[] }) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const [weather, setWeather] = useState<{ cloud: number | null }>({
    cloud: null,
  });
  const [sunText, setSunText] = useState("");
  const [introDone, setIntroDone] = useState(false);

  const points = useMemo(
    () =>
      pins.map((p) => ({
        lat: p.lat,
        lng: p.lng,
        label: p.label,
        color: p.color ?? "#1a5c2e",
      })),
    [pins]
  );

  const focus = pins[0] ?? { lat: 20, lng: 0, label: "" };

  useEffect(() => {
    const { lat, lng } = focus;
    const pos = SunCalc.getPosition(new Date(), lat, lng);
    const altDeg = (pos.altitude * 180) / Math.PI;
    const azDeg = (pos.azimuth * 180) / Math.PI;
    setSunText(
      `Sun position (illustrative, not PAR): altitude ${altDeg.toFixed(1)}°, azimuth ${azDeg.toFixed(1)}° at focus coordinates.`
    );
  }, [focus.lat, focus.lng]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const u = new URL("https://api.open-meteo.com/v1/forecast");
        u.searchParams.set("latitude", String(focus.lat));
        u.searchParams.set("longitude", String(focus.lng));
        u.searchParams.set("current", "cloud_cover");
        const r = await fetch(u.toString());
        const j = (await r.json()) as {
          current?: { cloud_cover?: number };
        };
        if (!cancelled && j.current?.cloud_cover != null) {
          setWeather({ cloud: j.current.cloud_cover });
        }
      } catch {
        if (!cancelled) setWeather({ cloud: null });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [focus.lat, focus.lng]);

  useEffect(() => {
    const g = globeRef.current;
    if (!g) return;
    g.pointOfView({ lat: 0, lng: 0, altitude: 2.8 }, 0);
    const t = window.setTimeout(() => {
      globeRef.current?.pointOfView(
        { lat: focus.lat, lng: focus.lng, altitude: 1.15 },
        2600
      );
      window.setTimeout(() => setIntroDone(true), 2800);
    }, 400);
    return () => window.clearTimeout(t);
  }, [focus.lat, focus.lng]);

  return (
    <div className="relative h-[min(72vh,640px)] w-full overflow-hidden rounded-xl border border-zinc-700 bg-black">
      <Globe
        ref={globeRef}
        globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
        bumpImageUrl="//unpkg.com/three-globe/example/img/earth-topology.png"
        backgroundImageUrl="//unpkg.com/three-globe/example/img/night-sky.png"
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor="color"
        pointLabel="label"
        pointAltitude={0.02}
        pointRadius={0.35}
        atmosphereColor="lightblue"
        atmosphereAltitude={0.15}
      />
      <div className="pointer-events-none absolute top-3 left-3 max-w-[min(90%,440px)] rounded-lg bg-black/65 px-3 py-2 text-xs text-zinc-100">
        <p>{sunText}</p>
        {weather.cloud != null ? (
          <p className="mt-1 text-zinc-300">
            Open-Meteo cloud cover (approx.): {weather.cloud}%
          </p>
        ) : null}
        {!introDone ? (
          <p className="mt-1 animate-pulse text-amber-200/90">
            Zooming to site…
          </p>
        ) : null}
      </div>
    </div>
  );
}
