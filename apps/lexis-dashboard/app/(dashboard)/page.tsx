import { LexisGlobe, type GlobePin } from "@/components/lexis-globe";
import { createClient } from "@/lib/supabase/server";

export default async function OverviewPage() {
  const supabase = await createClient();

  const [{ data: plantRows }, { data: stationRows }] = await Promise.all([
    supabase
      .from("plants")
      .select("id, nickname, latitude, longitude")
      .not("latitude", "is", null)
      .not("longitude", "is", null),
    supabase
      .from("stations")
      .select("id, name, latitude, longitude, location_label")
      .not("latitude", "is", null)
      .not("longitude", "is", null),
  ]);

  const pins: GlobePin[] = [];

  for (const s of stationRows ?? []) {
    if (s.latitude != null && s.longitude != null) {
      pins.push({
        lat: s.latitude,
        lng: s.longitude,
        label: s.location_label || s.name,
        color: "#2563eb",
      });
    }
  }

  for (const p of plantRows ?? []) {
    if (p.latitude != null && p.longitude != null) {
      pins.push({
        lat: p.latitude,
        lng: p.longitude,
        label: p.nickname,
        color: "#15803d",
      });
    }
  }

  if (pins.length === 0) {
    pins.push({
      lat: 40.7128,
      lng: -74.006,
      label: "Set latitude/longitude on stations or plants in Supabase to plot your sites.",
      color: "#71717a",
    });
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="mt-1 max-w-3xl text-sm text-zinc-600 dark:text-zinc-400">
          Globe shows optional WGS84 coordinates from your stations and plants. Sun
          angles are illustrative only; agronomic decisions belong with sensors and
          local validation.
        </p>
      </div>
      <LexisGlobe pins={pins} />
    </div>
  );
}
