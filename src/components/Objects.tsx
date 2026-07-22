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
  async function archive(id: string) {
    const { error } = await supabase
      .from("tracker_object")
      .update({ archived_at: new Date().toISOString() })
      .eq("id", id);

    if (!error) await refresh();
  }

  return (
    <section className="space-y-6">
      {/* --- Create form --- */}
      <form
        onSubmit={handleCreate}
        className="rounded-lg border border-neutral-800 bg-neutral-900 p-4 space-y-3"
      >
        <p className="text-sm text-neutral-400">New object</p>

        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (e.g. Reading)"
          required
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none focus:border-green-600"
        />

        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full rounded-md border border-neutral-800 bg-neutral-950 px-3 py-2 outline-none focus:border-green-600"
        />

        <div className="flex items-center gap-3">
          <span
            className="h-6 w-6 shrink-0 rounded-full border border-neutral-700"
            style={{ backgroundColor: `hsl(${hue} 65% 45%)` }}
          />
          <input
            type="range"
            min={0}
            max={360}
            value={hue}
            onChange={(e) => setHue(Number(e.target.value))}
            className="w-full accent-green-600"
          />
          <span className="w-10 text-right text-xs text-neutral-500">
            {hue}
          </span>
        </div>

        {formError && <p className="text-sm text-red-400">{formError}</p>}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-md bg-green-600 px-3 py-2 font-medium text-white hover:bg-green-500 disabled:opacity-50"
        >
          {busy ? "Adding…" : "Add object"}
        </button>
      </form>

      {/* --- List --- */}
      {load.state === "loading" && (
        <p className="text-sm text-neutral-500">Loading objects…</p>
      )}

      {load.state === "error" && (
        <p className="font-mono text-sm text-red-400">{load.message}</p>
      )}

      {load.state === "ready" && load.objects.length === 0 && (
        <p className="text-sm text-neutral-500">
          No objects yet. Add your first one above.
        </p>
      )}

      {load.state === "ready" && load.objects.length > 0 && (
        <ul className="space-y-2">
          {load.objects.map((obj) => (
            <li
              key={obj.id}
              className="flex items-center gap-3 rounded-lg border border-neutral-800 bg-neutral-900 p-3"
            >
              <span
                className="h-4 w-4 shrink-0 rounded-full"
                style={{ backgroundColor: `hsl(${obj.hue} 65% 45%)` }}
              />
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-white">{obj.name}</p>
                {obj.description && (
                  <p className="truncate text-sm text-neutral-500">
                    {obj.description}
                  </p>
                )}
              </div>
              <button
                onClick={() => archive(obj.id)}
                className="text-sm text-neutral-500 hover:text-red-400"
              >
                Archive
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
