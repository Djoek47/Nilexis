import { createClient } from "@/lib/supabase/server";

export default async function FarmsPage() {
  const supabase = await createClient();
  const { data: stations, error } = await supabase
    .from("stations")
    .select("id, name, location_label, latitude, longitude, location_note")
    .order("created_at", { ascending: false });

  const grouped = new Map<string, typeof stations>();
  for (const s of stations ?? []) {
    const key = s.location_label?.trim() || "Unlabeled site";
    const list = grouped.get(key) ?? [];
    list.push(s);
    grouped.set(key, list);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Farms & sites</h1>
      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        There is no separate <code className="rounded bg-zinc-200 px-1 dark:bg-zinc-800">farms</code>{" "}
        table yet. Grouping uses <strong>location_label</strong> on stations (and optional
        coordinates for the globe). Use labels to represent a farm or greenhouse name.
      </p>
      {error ? (
        <p className="text-sm text-red-600">{error.message}</p>
      ) : (
        <div className="space-y-6">
          {Array.from(grouped.entries()).map(([label, rows]) => (
            <section
              key={label}
              className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <h2 className="text-lg font-medium text-emerald-900 dark:text-emerald-300">
                {label}
              </h2>
              <ul className="mt-2 space-y-2 text-sm">
                {rows?.map((s) => (
                  <li key={s.id} className="text-zinc-700 dark:text-zinc-300">
                    <span className="font-medium">{s.name}</span>
                    {s.latitude != null && s.longitude != null
                      ? ` · ${s.latitude.toFixed(4)}, ${s.longitude.toFixed(4)}`
                      : " · no coordinates"}
                    {s.location_note ? ` — ${s.location_note}` : null}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
