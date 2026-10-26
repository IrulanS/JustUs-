import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { unlock, type Who } from "@/lib/ldr.functions";

export const Route = createFileRoute("/unlock")({
  head: () => ({
    meta: [
      { title: "Enter — Iru & Рахат" },
      { name: "description", content: "A space just for us two." },
      { property: "og:title", content: "Enter — Iru & Рахат" },
      { property: "og:description", content: "A space just for us two." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Unlock,
});

function Unlock() {
  const router = useRouter();
  const doUnlock = useServerFn(unlock);
  const [who, setWho] = useState<Who | null>(null);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!who) return;
    setBusy(true);
    const password = new FormData(e.currentTarget).get("password") as string;
    const { ok } = await doUnlock({ data: { password, who } });
    setBusy(false);
    if (ok) await router.navigate({ to: "/" });
    else setError(true);
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <form onSubmit={onSubmit} className="bento w-full max-w-sm space-y-6 p-7 text-center">
        <div>
          <h1 className="mt-2 font-display text-3xl italic">Who are you?</h1>
        </div>
        <div className="grid grid-cols-2 gap-3">
          {(
            [
              ["iru", "Iru", "Paris"],
              ["paxat", "Рахат", "Aktobe"],
            ] as const
          ).map(([id, name, city]) => (
            <button
              type="button"
              key={id}
              onClick={() => setWho(id as Who)}
              className={`rounded-2xl border-2 p-4 transition ${who === id ? "border-primary bg-secondary" : "border-border bg-card"}`}
            >
              <div className="text-lg font-semibold">{name}</div>
              <div className="text-xs text-muted-foreground">{city}</div>
            </button>
          ))}
        </div>
        <input
          name="password"
          type="password"
          autoComplete="current-password"
          placeholder="Our secret code"
          className="w-full rounded-full border border-input bg-card px-5 py-3 text-center outline-none focus:ring-2 focus:ring-ring"
        />
        {error && <p className="text-sm text-destructive">That's not the right code 🥺</p>}
        <button
          disabled={!who || busy}
          className="w-full rounded-full bg-gradient-primary py-3 font-semibold text-primary-foreground shadow-md disabled:opacity-50"
        >
          {busy ? "..." : "Enter 💗"}
        </button>
      </form>
    </main>
  );
}