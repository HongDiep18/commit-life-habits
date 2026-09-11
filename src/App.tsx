import { useState } from "react";
import { Auth } from "./components/Auth";
import { Grid } from "./components/Grid";
import { Objects } from "./components/Objects";
import { Today } from "./components/Today";
import { supabase } from "./lib/supabase";
import { useSession } from "./lib/useSession";

type Tab = "grid" | "today" | "objects";

const TABS: { id: Tab; label: string }[] = [
  { id: "grid", label: "Grid" },
  { id: "today", label: "Today" },
  { id: "objects", label: "Objects" },
];

function App() {
  const { session, loading } = useSession();
  const [tab, setTab] = useState<Tab>("grid");

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-neutral-950 text-neutral-500">
        Loading…
      </main>
    );
  }

  if (!session) return <Auth />;

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-200">
      {/* subtle emerald glow behind the header */}
      <div
        className="pointer-events-none fixed inset-x-0 top-0 h-64"
        style={{
          background:
            "radial-gradient(60% 100% at 50% 0%, rgba(16,185,129,0.10), transparent 70%)",
        }}
      />

      <header className="sticky top-0 z-10 border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-3">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-emerald-500/15">
              <span className="h-3 w-3 rounded-sm bg-emerald-400" />
            </span>
            <span className="text-lg font-semibold tracking-tight text-white">
              Commit Tracker Habits
            </span>
          </div>

          <nav className="flex items-center gap-1 rounded-lg border border-neutral-800 bg-neutral-900/60 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={
                  "rounded-md px-3.5 py-1.5 text-sm font-medium transition " +
                  (tab === t.id
                    ? "bg-neutral-800 text-white shadow-sm"
                    : "text-neutral-400 hover:text-neutral-200")
                }
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-neutral-500 md:block">
              {session.user.email}
            </span>
            <button
              onClick={() => supabase.auth.signOut()}
              className="rounded-md border border-neutral-800 px-3 py-1.5 text-sm text-neutral-300 transition hover:border-neutral-700 hover:text-white"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="relative mx-auto max-w-5xl px-6 py-8">
        {tab === "grid" && <Grid />}
        {tab === "today" && <Today />}
        {tab === "objects" && <Objects />}
      </main>
    </div>
  );
}

export default App;
