import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { TrackerObject } from './Objects'

// ---- date helpers (all local time — the grid mirrors what Today wrote) ----

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n)
}

// Format a Date as YYYY-MM-DD in LOCAL time — matches tick_event.tick_date.
function key(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
]

// ---- color: fixed minute buckets, shaded within the chosen hue ----
// 0 = grey, 1-30 light, 31-60, 61-120, 120+ darkest.
function colorFor(minutes: number, hue: number): string | undefined {
  if (minutes <= 0) return undefined // falls back to the grey base class
  const lightness =
    minutes <= 30 ? 75 : minutes <= 60 ? 58 : minutes <= 120 ? 42 : 28
  return `hsl(${hue} 60% ${lightness}%)`
}

type Row = { object_id: string; tick_date: string; minutes: number }

type LoadState =
  | { state: 'loading' }
  | { state: 'error'; message: string }
  | { state: 'ready' }

export function Grid() {
  const [load, setLoad] = useState<LoadState>({ state: 'loading' })
  const [rows, setRows] = useState<Row[]>([])
  const [objects, setObjects] = useState<TrackerObject[]>([])
  const [selected, setSelected] = useState<string>('all') // 'all' | object id

  // The visible window: aligned to whole weeks ending today.
  const { days, weeks } = useMemo(() => {
    const end = startOfDay(new Date())
    const roughStart = addDays(end, -364)
    // back up to the previous Sunday so column 0 is a full week
    const start = addDays(roughStart, -roughStart.getDay())

    const days: Date[] = []
    for (let d = start; d <= end; d = addDays(d, 1)) days.push(d)

    const weeks: Date[][] = []
    for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7))
    return { days, weeks }
  }, [])

  useEffect(() => {
    async function run() {
      const startKey = key(days[0])

      const objRes = await supabase
        .from('tracker_object')
        .select('*')
        .is('archived_at', null)
        .order('created_at', { ascending: false })

      if (objRes.error) {
        setLoad({ state: 'error', message: objRes.error.message })
        return
      }

      const totRes = await supabase
        .from('daily_total')
        .select('object_id, tick_date, minutes')
        .gte('tick_date', startKey)

      if (totRes.error) {
        setLoad({ state: 'error', message: totRes.error.message })
        return
      }

      setObjects(objRes.data as TrackerObject[])
      setRows(totRes.data as Row[])
      setLoad({ state: 'ready' })
    }
    run()
  }, [days])

  // minutes-per-day, respecting the object filter.
  const perDay = useMemo(() => {
    const map: Record<string, number> = {}
    for (const r of rows) {
      if (selected !== 'all' && r.object_id !== selected) continue
      map[r.tick_date] = (map[r.tick_date] ?? 0) + r.minutes
    }
    return map
  }, [rows, selected])

  // The hue to paint with: green for "All", the object's own hue when filtered.
  const hue =
    selected === 'all'
      ? 145
      : objects.find((o) => o.id === selected)?.hue ?? 145

  // Header stats + streaks, all derived from perDay over the visible days.
  const stats = useMemo(() => {
    let totalMinutes = 0
    let activeDays = 0
    let longest = 0
    let run = 0
    for (const d of days) {
      const m = perDay[key(d)] ?? 0
      if (m > 0) {
        totalMinutes += m
        activeDays += 1
        run += 1
        if (run > longest) longest = run
      } else {
        run = 0
      }
    }
    // current streak: walk backward from today
    let current = 0
    for (let i = days.length - 1; i >= 0; i--) {
      if ((perDay[key(days[i])] ?? 0) > 0) current += 1
      else break
    }
    return { totalMinutes, activeDays, longest, current }
  }, [days, perDay])

  // Which weeks should show a month label (first week a new month appears).
  const monthLabels = useMemo(() => {
    let last = -1
    return weeks.map((week) => {
      const first = week[0]
      if (!first) return ''
      const mo = first.getMonth()
      if (mo !== last) {
        last = mo
        return MONTHS[mo]
      }
      return ''
    })
  }, [weeks])

  if (load.state === 'loading')
    return <p className="text-sm text-neutral-500">Loading grid…</p>

  if (load.state === 'error')
    return <p className="font-mono text-sm text-red-400">{load.message}</p>

  return (
    <section className="space-y-4">
      {/* header + object filter */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-neutral-300">
          <span className="font-semibold text-white">
            {stats.totalMinutes.toLocaleString()}
          </span>{' '}
          minutes across{' '}
          <span className="font-semibold text-white">{stats.activeDays}</span>{' '}
          days in the last 12 months
        </p>

        <select
          value={selected}
          onChange={(e) => setSelected(e.target.value)}
          className="rounded-md border border-neutral-800 bg-neutral-900 px-2 py-1 text-sm outline-none focus:border-green-600"
        >
          <option value="all">All objects</option>
          {objects.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      </div>

      {/* the calendar */}
      <div className="overflow-x-auto">
        <div className="inline-block">
          {/* month labels */}
          <div className="mb-1 flex gap-1 pl-8">
            {monthLabels.map((label, i) => (
              <div key={i} className="relative h-3 w-3">
                {label && (
                  <span className="absolute left-0 top-0 whitespace-nowrap text-[10px] text-neutral-500">
                    {label}
                  </span>
                )}
              </div>
            ))}
          </div>

          {/* weekday column + week columns */}
          <div className="flex gap-1">
            <div className="flex w-7 shrink-0 flex-col gap-1 text-[10px] leading-3 text-neutral-500">
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((l, r) => (
                <div key={r} className="h-3">
                  {l}
                </div>
              ))}
            </div>

            {weeks.map((week, i) => (
              <div key={i} className="flex flex-col gap-1">
                {week.map((day) => {
                  const mins = perDay[key(day)] ?? 0
                  return (
                    <div
                      key={key(day)}
                      title={`${key(day)} · ${mins} min`}
                      className="h-3 w-3 rounded-sm bg-neutral-800"
                      style={{ backgroundColor: colorFor(mins, hue) }}
                    />
                  )
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* streaks + legend */}
      <div className="flex items-center justify-between text-sm text-neutral-400">
        <p>
          Current streak:{' '}
          <span className="font-semibold text-white">{stats.current}</span> ·
          Longest:{' '}
          <span className="font-semibold text-white">{stats.longest}</span>
        </p>

        <div className="flex items-center gap-1 text-xs text-neutral-500">
          <span>Less</span>
          <span className="h-3 w-3 rounded-sm bg-neutral-800" />
          {[20, 45, 90, 150].map((m) => (
            <span
              key={m}
              className="h-3 w-3 rounded-sm"
              style={{ backgroundColor: colorFor(m, hue) }}
            />
          ))}
          <span>More</span>
        </div>
      </div>
    </section>
  )
}
