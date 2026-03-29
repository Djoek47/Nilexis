import { createClient } from "@/lib/supabase/server";

export default async function PlantsPage() {
  const supabase = await createClient();
  const { data: plants, error } = await supabase
    .from("plants")
    .select(
      "id, nickname, species, stage, target_market_date, latitude, longitude, station_id"
    )
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Plants</h1>
      {error ? (
        <p className="text-sm text-red-600">{error.message}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 font-medium">Nickname</th>
                <th className="px-4 py-3 font-medium">Species</th>
                <th className="px-4 py-3 font-medium">Stage</th>
                <th className="px-4 py-3 font-medium">Market</th>
                <th className="px-4 py-3 font-medium">Lat / Lng</th>
              </tr>
            </thead>
            <tbody>
              {(plants ?? []).map((p) => (
                <tr
                  key={p.id}
                  className="border-b border-zinc-100 dark:border-zinc-800/80"
                >
                  <td className="px-4 py-3 font-medium">{p.nickname}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {p.species ?? "—"}
                  </td>
                  <td className="px-4 py-3">{p.stage}</td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {p.target_market_date ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-zinc-600 dark:text-zinc-400">
                    {p.latitude != null && p.longitude != null
                      ? `${p.latitude.toFixed(4)}, ${p.longitude.toFixed(4)}`
                      : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(plants ?? []).length === 0 ? (
            <p className="p-6 text-center text-sm text-zinc-500">No plants.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
