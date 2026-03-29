import { createClient } from "@/lib/supabase/server";

export default async function StationsPage() {
  const supabase = await createClient();
  const { data: stations, error } = await supabase
    .from("stations")
    .select(
      "id, name, arduino_thing_id, location_label, latitude, longitude, created_at"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Stations</h1>
      {error ? (
        <p className="text-sm text-red-600">{error.message}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Thing ID</th>
                <th className="px-4 py-3 font-medium">Location label</th>
                <th className="px-4 py-3 font-medium">Lat / Lng</th>
              </tr>
            </thead>
            <tbody>
              {(stations ?? []).map((s) => (
                <tr
                  key={s.id}
                  className="border-b border-zinc-100 dark:border-zinc-800/80"
                >
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-zinc-600 dark:text-zinc-400">
                    {s.arduino_thing_id ?? "—"}
                  </td>
                  <td className="px-4 py-3">{s.location_label ?? "—"}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {s.latitude != null && s.longitude != null
                      ? `${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(stations ?? []).length === 0 ? (
            <p className="p-6 text-center text-sm text-zinc-500">
              No stations.
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
