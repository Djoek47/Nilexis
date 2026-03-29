import { createClient } from "@/lib/supabase/server";

export default async function TelemetryPage() {
  const supabase = await createClient();

  const { data: stations } = await supabase
    .from("stations")
    .select("id, name")
    .order("name");

  const { data: snapshots, error } = await supabase
    .from("sensor_snapshots")
    .select(
      "id, station_id, ph, ec, temp_air_c, humidity_pct, light_lux, water_level_norm, pump_running, recorded_at"
    )
    .order("recorded_at", { ascending: false })
    .limit(80);

  const names = new Map((stations ?? []).map((s) => [s.id, s.name]));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Telemetry</h1>
      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Latest readings from <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">sensor_snapshots</code>
        . Ingestion uses the Nelexis API webhook with the service role; this view is read-only under your user RLS.
      </p>
      {error ? (
        <p className="text-sm text-red-600">{error.message}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[960px] text-left text-xs">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-3 py-2 font-medium">Time (UTC)</th>
                <th className="px-3 py-2 font-medium">Station</th>
                <th className="px-3 py-2 font-medium">pH</th>
                <th className="px-3 py-2 font-medium">EC</th>
                <th className="px-3 py-2 font-medium">°C</th>
                <th className="px-3 py-2 font-medium">RH%</th>
                <th className="px-3 py-2 font-medium">Lux</th>
                <th className="px-3 py-2 font-medium">Water</th>
                <th className="px-3 py-2 font-medium">Pump</th>
              </tr>
            </thead>
            <tbody>
              {(snapshots ?? []).map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-zinc-100 dark:border-zinc-800/80"
                >
                  <td className="px-3 py-2 whitespace-nowrap font-mono">
                    {r.recorded_at?.slice(0, 19).replace("T", " ") ?? "—"}
                  </td>
                  <td className="px-3 py-2">
                    {names.get(r.station_id) ?? r.station_id.slice(0, 8)}
                  </td>
                  <td className="px-3 py-2">{r.ph ?? "—"}</td>
                  <td className="px-3 py-2">{r.ec ?? "—"}</td>
                  <td className="px-3 py-2">{r.temp_air_c ?? "—"}</td>
                  <td className="px-3 py-2">{r.humidity_pct ?? "—"}</td>
                  <td className="px-3 py-2">{r.light_lux ?? "—"}</td>
                  <td className="px-3 py-2">{r.water_level_norm ?? "—"}</td>
                  <td className="px-3 py-2">
                    {r.pump_running == null ? "—" : r.pump_running ? "on" : "off"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(snapshots ?? []).length === 0 ? (
            <p className="p-6 text-center text-sm text-zinc-500">
              No snapshots yet.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
