import { createClient } from "@/lib/supabase/server";

export default async function CarePage() {
  const supabase = await createClient();
  const { data: tasks, error } = await supabase
    .from("care_tasks")
    .select(
      "id, title, task_type, source, due_at, completed_at, plant_id, station_id"
    )
    .order("due_at", { ascending: true })
    .limit(100);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Care tasks</h1>
      <p className="max-w-2xl text-sm text-zinc-600 dark:text-zinc-400">
        Tasks from rules and generated plans. Completing work still flows through the
        mobile app or API with the same safety policies as today.
      </p>
      {error ? (
        <p className="text-sm text-red-600">{error.message}</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-zinc-200 dark:border-zinc-800">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900">
              <tr>
                <th className="px-4 py-3 font-medium">Due</th>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Type</th>
                <th className="px-4 py-3 font-medium">Source</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {(tasks ?? []).map((t) => (
                <tr
                  key={t.id}
                  className="border-b border-zinc-100 dark:border-zinc-800/80"
                >
                  <td className="px-4 py-3 whitespace-nowrap text-zinc-600 dark:text-zinc-400">
                    {t.due_at?.slice(0, 16).replace("T", " ") ?? "—"}
                  </td>
                  <td className="px-4 py-3">{t.title}</td>
                  <td className="px-4 py-3">{t.task_type}</td>
                  <td className="px-4 py-3">{t.source}</td>
                  <td className="px-4 py-3">
                    {t.completed_at ? (
                      <span className="text-emerald-700 dark:text-emerald-400">
                        Done
                      </span>
                    ) : (
                      "Open"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {(tasks ?? []).length === 0 ? (
            <p className="p-6 text-center text-sm text-zinc-500">No tasks.</p>
          ) : null}
        </div>
      )}
    </div>
  );
}
