import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { TrackerObject } from "./Objects";

// ---- date helpers (all local time — the grid mirrors what Today wrote) ----

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

// Format a Date as YYYY-MM-DD in LOCAL time — matches tick_event.tick_date.
function key(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// Human-readable date for tooltips: DD-MM-YYYY (day-month-year).
function dmy(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${day}-${m}-${y}`;
}

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

// ---- color: fixed minute buckets, shaded within the chosen hue ----
// 0 = grey, 1-30 light, 31-60, 61-120, 120+ darkest.
function colorFor(minutes: number, hue: number): string | undefined {
  if (minutes <= 0) return undefined; // falls back to the grey base class
  const lightness =
    minutes <= 30 ? 72 : minutes <= 60 ? 56 : minutes <= 120 ? 42 : 30;
  return `hsl(${hue} 62% ${lightness}%)`;
}

type Row = { object_id: string; tick_date: string; minutes: number };

type LoadState =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready" };

export function Grid() {
  const [load, setLoad] = useState<LoadState>({ state: "loading" });
  const [rows, setRows] = useState<Row[]>([]);
  const [objects, setObjects] = useState<TrackerObject[]>([]);
  const [selected, setSelected] = useState<string>("all"); // 'all' | object id

  // Custom tooltip that appears instantly on hover (the native `title`
  // attribute has a ~1s browser delay we can't control). It follows the
  // cursor and shows text for the hovered cell.
  const [tip, setTip] = useState<{ text: string; x: number; y: number } | null>(
    null,
  );

  // The visible window: aligned to whole weeks ending today.
  const { days, weeks } = useMemo(() => {
    const end = startOfDay(new Date());
    const roughStart = addDays(end, -364);
    // back up to the previous Sunday so column 0 is a full week
    const start = addDays(roughStart, -roughStart.getDay());

    const days: Date[] = [];
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d);

    const weeks: Date[][] = [];
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
    return { days, weeks };
  }, []);

  useEffect(() => {
    async function run() {
      const startKey = key(days[0]);

      const objRes = await supabase
        .from("tracker_object")
        .select("*")
        .is("archived_at", null)
        .order("created_at", { ascending: false });

      if (objRes.error) {
        setLoad({ state: "error", message: objRes.error.message });
        return;
      }

      const totRes = await supabase
        .from("daily_total")
        .select("object_id, tick_date, minutes")
        .gte("tick_date", startKey);

      if (totRes.error) {
        setLoad({ state: "error", message: totRes.error.message });
        return;
      }

      setObjects(objRes.data as TrackerObject[]);
      setRows(totRes.data as Row[]);
      setLoad({ state: "ready" });
    }
    run();
  }, [days]);

  // minutes-per-day, respecting the object filter.
  const perDay = useMemo(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      if (selected !== "all" && r.object_id !== selected) continue;
      map[r.tick_date] = (map[r.tick_date] ?? 0) + r.minutes;
    }
    return map;
  }, [rows, selected]);

  // The hue to paint with: green for "All", the object's own hue when filtered.
  const hue =
    selected === "all"
      ? 145
      : (objects.find((o) => o.id === selected)?.hue ?? 145);

  // Header stats + streaks, all derived from perDay over the visible days.
  const stats = useMemo(() => {
    let totalMinutes = 0;
    let activeDays = 0;
    let longest = 0;
    let run = 0;
    for (const d of days) {
      const m = perDay[key(d)] ?? 0;
      if (m > 0) {
        totalMinutes += m;
        activeDays += 1;
        run += 1;
        if (run > longest) longest = run;
      } else {
        run = 0;
      }
    }
    // current streak: walk backward from today
    let current = 0;
    for (let i = days.length - 1; i >= 0; i--) {
      if ((perDay[key(days[i])] ?? 0) > 0) current += 1;
      else break;
    }
    return { totalMinutes, activeDays, longest, current };
  }, [days, perDay]);

  // Which weeks should show a month label (first week a new month appears).
  const monthLabels = useMemo(() => {
    const labels: string[] = [];
    let last = -1;
    for (const week of weeks) {
      const first = week[0];
      const mo = first ? first.getMonth() : last;
      if (first && mo !== last) {
        labels.push(MONTHS[mo]);
        last = mo;
      } else {
        labels.push("");
      }
    }
    return labels;
  }, [weeks]);

  if (load.state === "loading")
    return <p className="text-sm text-neutral-500">Loading grid…</p>;

  if (load.state === "error")
    return <p className="font-mono text-sm text-red-400">{load.message}</p>;

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Activity
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            <span className="font-medium text-neutral-200">
              {stats.totalMinutes.toLocaleString()}
            </span>{" "}
            minutes across{" "}
            <span className="font-medium text-neutral-200">
              {stats.activeDays}
            </span>{" "}
            days in the last 12 months
          </p>
        </div>

        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-200 outline-none transition focus:border-emerald-600"
        >
          <option value="all">All objects</option>
          {objects.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {/* stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total minutes"
          value={stats.totalMinutes.toLocaleString()}
        />
        <StatCard label="Active days" value={String(stats.activeDays)} />
        <StatCard label="Current streak" value={`${stats.current}d`} />
        <StatCard label="Longest streak" value={`${stats.longest}d`} />
      </div>

      {/* calendar card */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5">
        <div className="overflow-x-auto">
          <div className="inline-block">
            {/* month labels */}
            <div className="mb-1.5 flex gap-1 pl-9">
              {monthLabels.map((label, i) => (
                <div key={i} className="relative h-3 w-3">
                  {label && (
                    <span className="absolute left-0 top-0 whitespace-nowrap text-[11px] text-neutral-500">
                      {label}
                    </span>
                  )}
                </div>
              ))}
            </div>

            {/* weekday column + week columns */}
            <div className="flex gap-1">
              <div className="flex w-8 shrink-0 flex-col gap-1 pr-1 text-[11px] leading-3 text-neutral-500">
                {["", "Mon", "", "Wed", "", "Fri", ""].map((l, r) => (
                  <div key={r} className="h-3">
                    {l}
                  </div>
                ))}
              </div>

              {weeks.map((week, i) => (
                <div key={i} className="flex flex-col gap-1">
                  {week.map((day) => {
                    const mins = perDay[key(day)] ?? 0;
                    const text = `${mins} min · ${dmy(day)}`;
                    return (
                      <div
                        key={key(day)}
                        onMouseEnter={(e) =>
                          setTip({ text, x: e.clientX, y: e.clientY })
                        }
                        onMouseMove={(e) =>
                          setTip({ text, x: e.clientX, y: e.clientY })
                        }
                        onMouseLeave={() => setTip(null)}
                        className="h-3 w-3 rounded-[3px] bg-neutral-800 transition-all hover:ring-1 hover:ring-neutral-500"
                        style={{ backgroundColor: colorFor(mins, hue) }}
                      />
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* legend */}
        <div className="mt-4 flex items-center justify-end gap-1.5 text-xs text-neutral-500">
          <span>Less</span>
          <span className="h-3 w-3 rounded-[3px] bg-neutral-800" />
          {[20, 45, 90, 150].map((m) => (
            <span
              key={m}
              className="h-3 w-3 rounded-[3px]"
              style={{ backgroundColor: colorFor(m, hue) }}
            />
          ))}
          <span>More</span>
        </div>
      </div>

      {/* instant hover tooltip, positioned just above the cursor */}
      {tip && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md border border-neutral-700 bg-neutral-950 px-2 py-1 text-xs text-neutral-100 shadow-lg"
          style={{ left: tip.x, top: tip.y - 8 }}
        >
          {tip.text}
        </div>
      )}
    </section>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-4">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      <p className="mt-1.5 text-2xl font-semibold tracking-tight text-white">
        {value}
      </p>
    </div>
  );
}
