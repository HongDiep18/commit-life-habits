import type { FormEvent } from "react";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

// The shape of a row in tracker_object. Today and Grid will reuse this.
export type TrackerObject = {
  id: string;
  name: string;
  description: string | null;
  hue: number;
  archived_at: string | null;
  created_at: string;
};

type LoadState =
  | { state: "loading" }
  | { state: "error"; message: string }
  | { state: "ready"; objects: TrackerObject[] };

export function Objects() {
  const [load, setLoad] = useState<LoadState>({ state: "loading" });

  // Create-form fields.
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [hue, setHue] = useState(145); // 145 = green, the schema default
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // The object pending archive-confirmation (null = no toast showing).
  const [confirm, setConfirm] = useState<TrackerObject | null>(null);

  // Read all active (non-archived) objects, newest first.
  async function refresh() {
    const { data, error } = await supabase
      .from("tracker_object")
      .select("*")
      .is("archived_at", null)
      .order("created_at", { ascending: false });

    if (error) setLoad({ state: "error", message: error.message });
    else setLoad({ state: "ready", objects: data as TrackerObject[] });
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setFormError(null);

    const { error } = await supabase.from("tracker_object").insert({
      name: name.trim(),
      description: description.trim() || null, // empty box → null, not ''
      hue,
    });

    if (error) {
      setFormError(error.message);
    } else {
      setName("");
      setDescription("");
      setHue(145);
      await refresh();
    }
    setBusy(false);
  }

  // Archive, don't delete — this keeps every tick_event in history.
  // Called only after the user confirms in the toast.
  async function archive(id: string) {
    const { error } = await supabase
      .from("tracker_object")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id);

    setConfirm(null);
    if (!error) await refresh();
  }

  return (
    <section className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-white">
          Objects
        </h1>
        <p className="mt-1 text-sm text-neutral-400">
          The things you track. Archive keeps their history; it never deletes.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        {/* --- Create form --- */}
        <form
          onSubmit={handleCreate}
          className="h-fit space-y-4 rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 md:sticky md:top-20"
        >
          <p className="text-sm font-medium text-neutral-300">New object</p>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name (e.g. Reading)"
            required
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none transition focus:border-emerald-600"
          />

          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            className="w-full rounded-lg border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none transition focus:border-emerald-600"
          />

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-neutral-500">
              <span>Color</span>
              <span>{hue}</span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="h-8 w-8 shrink-0 rounded-lg border border-neutral-700"
                style={{ backgroundColor: `hsl(${hue} 65% 45%)` }}
              />
              <input
                type="range"
                min={0}
                max={360}
                value={hue}
                onChange={(e) => setHue(Number(e.target.value))}
                className="w-full accent-emerald-500"
              />
            </div>
          </div>

          {formError && <p className="text-sm text-red-400">{formError}</p>}

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-lg bg-emerald-600 px-3 py-2 font-medium text-white transition hover:bg-emerald-500 disabled:opacity-50"
          >
            {busy ? "Adding…" : "Add object"}
          </button>
        </form>

        {/* --- List --- */}
        <div>
          {load.state === "loading" && (
            <p className="text-sm text-neutral-500">Loading objects…</p>
          )}

          {load.state === "error" && (
            <p className="font-mono text-sm text-red-400">{load.message}</p>
          )}

          {load.state === "ready" && load.objects.length === 0 && (
            <div className="rounded-xl border border-dashed border-neutral-800 bg-neutral-900/40 p-10 text-center">
              <p className="text-sm text-neutral-400">
                No objects yet. Add your first one on the left.
              </p>
            </div>
          )}

          {load.state === "ready" && load.objects.length > 0 && (
            <ul className="space-y-2">
              {load.objects.map((obj) => (
                <li
                  key={obj.id}
                  className="group flex items-center gap-3 rounded-xl border border-neutral-800 bg-neutral-900/50 p-4 transition hover:border-neutral-700"
                >
                  <span
                    className="h-4 w-4 shrink-0 rounded-full"
                    style={{ backgroundColor: `hsl(${obj.hue} 65% 45%)` }}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-white">
                      {obj.name}
                    </p>
                    {obj.description && (
                      <p className="truncate text-sm text-neutral-500">
                        {obj.description}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => setConfirm(obj)}
                    className="rounded-md px-2 py-1 text-sm text-neutral-500 opacity-0 transition hover:text-red-400 group-hover:opacity-100"
                  >
                    Archive
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* archive confirmation toast */}
      {confirm && (
        <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center px-6">
          <div className="flex items-center gap-4 rounded-xl border border-neutral-700 bg-neutral-900 px-5 py-3 shadow-xl">
            <p className="text-sm text-neutral-200">
              Archive{" "}
              <span className="font-medium text-white">“{confirm.name}”</span>?
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setConfirm(null)}
                className="rounded-lg border border-neutral-700 px-3 py-1.5 text-sm text-neutral-300 transition hover:border-neutral-600 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => archive(confirm.id)}
                className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-red-500"
              >
                Archive
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
