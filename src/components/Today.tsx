import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import type { TrackerObject } from "./Objects";

// Today's date in the BROWSER's local timezone, as YYYY-MM-DD.
// We send this with every tick. Postgres current_date is UTC and would
// misfile an evening entry into the next day — so the client decides.
function localToday(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Quick-add buttons, in minutes.
const QUICK = [5, 15, 30];

type LoadState =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready" };

export function Today() {
  const today = localToday();

  const [load, setLoad] = useState<LoadState>({ state: "loading" });
  const [objects, setObjects] = useState<TrackerObject[]>([]);
  const [totals, setTotals] = useState<Record<string, number>>({}); // object_id -> minutes today
  const [custom, setCustom] = useState<Record<string, string>>({}); // object_id -> free-text box

  async function refresh() {
    // 1. The active objects to show a row for.
    const objRes = await supabase
      .from("tracker_object")
      .select("*")
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (objRes.error) {
      setLoad({ state: "error", message: objRes.error.message });
      return;
    }

    // 2. Today's summed minutes per object, from the daily_total view.
    const totRes = await supabase
      .from("daily_total")
      .select("object_id, minutes")
      .eq("tick_date", today);

    if (totRes.error) {
      setLoad({ state: "error", message: totRes.error.message });
      return;
    }

    const map: Record<string, number> = {};
    for (const row of totRes.data as { object_id: string; minutes: number }[]) {
      map[row.object_id] = row.minutes;
    }

    setObjects(objRes.data as TrackerObject[]);
    setTotals(map);
    setLoad({ state: "ready" });
  }

  useEffect(() => {
    refresh();
  }, []);

  // Every tap is an APPEND — a new tick_event row, never an overwrite.
  // We update the on-screen total immediately so it feels instant.
  async function addTick(objectId: string, minutes: number) {
    if (!minutes) return;

    const { error } = await supabase.from("tick_event").insert({
      object_id: objectId,
      tick_date: today,
      minutes,
    });

    if (error) {
      setLoad({ state: "error", message: error.message });
    } else {
      setTotals((t) => ({ ...t, [objectId]: (t[objectId] ?? 0) + minutes }));
    }
  }

  function addCustom(objectId: string) {
    const raw = custom[objectId]?.trim();
    if (!raw) return;
    const minutes = parseInt(raw, 10);
    if (!Number.isFinite(minutes) || minutes === 0) return;
    addTick(objectId, minutes);
    setCustom((c) => ({ ...c, [objectId]: "" }));
  }

  if (load.state === "loading")
    return <p className="text-sm text-neutral-500">Loading today…</p>;

  if (load.state === "error")
    return <p className="font-mono text-sm text-red-400">{load.message}</p>;

  if (objects.length === 0)
    return (
      <p className="text-sm text-neutral-500">
        No objects yet. Add one on the Objects tab first.
      </p>
    );

  return (
    <section className="space-y-3">
      {objects.map((obj) => {
        const total = totals[obj.id] ?? 0;
        return (
          <div
            key={obj.id}
            className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <span
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: `hsl(${obj.hue} 65% 45%)` }}
              />
              <p className="flex-1 font-medium text-white">{obj.name}</p>
              <p className="text-sm text-neutral-400">
                <span className="text-lg font-semibold text-green-400">
                  {total}
                </span>{" "}
                min today
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {QUICK.map((m) => (
                <button
                  key={m}
                  onClick={() => addTick(obj.id, m)}
                  className="rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-500"
                >
                  +{m}
                </button>
              ))}

              <div className="ml-auto flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  value={custom[obj.id] ?? ""}
                  onChange={(e) =>
                    setCustom((c) => ({ ...c, [obj.id]: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addCustom(obj.id);
                  }}
                  placeholder="min"
                  className="w-16 rounded-md border border-neutral-800 bg-neutral-950 px-2 py-1.5 text-sm outline-none focus:border-green-600"
                />
                <button
                  onClick={() => addCustom(obj.id)}
                  className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 hover:border-green-600 hover:text-white"
                >
                  Add
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}
