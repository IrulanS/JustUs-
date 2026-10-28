import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useRouter } from "@tanstack/react-router";
import { Heart, LogOut, Pencil, Send } from "lucide-react";
import { toast } from "sonner";
import { BucketLists } from "@/components/BucketLists";
import { NoteDocs } from "@/components/NoteDocs";
import { Questions } from "@/components/Questions";
import { isNoteActive } from "@/lib/notes";
import {
  getDashboard,
  lock,
  postNote,
  sendHeart,
  setMood,
  updateSettings,
  type Who,
} from "@/lib/ldr.functions";

const PEOPLE = {
  iru: { name: "Iru", city: "Paris", tz: "Europe/Paris", lat: 48.8566, lon: 2.3522 },
  paxat: { name: "Рахат", city: "Aktobe", tz: "Asia/Aqtobe", lat: 50.2839, lon: 57.167 },
} as const;

const MOODS = [
  ["🥳", "super happy"],
  ["🥰", "thinking of u"],
  ["😎", "chill"],
  ["😊", "focused"],
  ["🤤", "hungry"],
  ["😴", "tired"],
  ["🥺", "missing u"],
  ["😭", "sad"],
  ["😟", "stressed"],
  ["😑", "grumpy"],
  ["🤧", "unwell"],
  ["👉👈", "wanting u"],
] as const;

function weatherEmoji(code: number, day: boolean) {
  if (code === 0) return day ? "☀️" : "🌙";
  if (code <= 2) return day ? "🌤️" : "☁️";
  if (code === 3) return "☁️";
  if (code <= 48) return "🌫️";
  if (code <= 67) return "🌧️";
  if (code <= 77) return "❄️";
  if (code <= 82) return "🌦️";
  if (code <= 86) return "🌨️";
  return "⛈️";
}

const dayKey = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });

export function Dashboard() {
  const fetchDash = useServerFn(getDashboard);
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["dashboard"],
    queryFn: () => fetchDash(),
    refetchInterval: 4000,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["dashboard"] });

  const [floating, setFloating] = useState<{ id: string; left: number; mine: boolean }[]>([]);
  const seen = useRef<Set<string> | null>(null);
  const spawn = (n: number, mine: boolean) => {
    const items = Array.from({ length: n }, () => ({
      id: Math.random().toString(36),
      left: 10 + Math.random() * 80,
      mine,
    }));
    setFloating((f) => [...f, ...items]);
    setTimeout(() => setFloating((f) => f.filter((x) => !items.includes(x))), 2800);
  };
  useEffect(() => {
    if (!data) return;
    const ids = data.recentHearts.map((h) => h.id);
    if (seen.current === null) {
      seen.current = new Set(ids);
      return;
    }
    const seenIds = seen.current;
    const fresh = data.recentHearts.filter((h) => !seenIds.has(h.id));
    fresh.forEach((h) => seenIds.add(h.id));
    const fromOther = fresh.filter((h) => h.who !== data.who).length;
    if (fromOther > 0) {
      spawn(Math.min(fromOther * 4, 20), false);
      toast(`${PEOPLE[data.who === "iru" ? "paxat" : "iru"].name} sends you hearts 💗`);
    }
  }, [data]);

  if (!data) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Just a moment...
      </div>
    );
  }

  const me = data.who as Who;
  const other: Who = me === "iru" ? "paxat" : "iru";

  return (
    <main className="mx-auto max-w-5xl px-4 pb-16 pt-[max(1.25rem,env(safe-area-inset-top))]">
      <Header />
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        <WeatherTile who="iru" />
        <WeatherTile who="paxat" />
        <Countdown next={data.settings?.next_meet} last={data.settings?.last_meet} onSaved={refresh} />
        <MoodTile me={me} other={other} moods={data.moods} onSaved={refresh} />
        <HeartTile
          me={me}
          other={other}
          today={data.heartsToday}
          onSend={() => {
            spawn(5, true);
            refresh();
          }}
        />
        <NotesTile me={me} notes={data.notes} onSaved={refresh} />
        <BucketLists lists={data.bucketLists} items={data.bucketItems} onSaved={refresh} />
        <Questions questions={data.questions} drawnId={data.settings?.drawn_question_id} onSaved={refresh} />
        <NoteDocs docs={data.noteDocs} onSaved={refresh} />
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 h-0">
        {floating.map((f) => (
          <span
            key={f.id}
            className="float-heart absolute bottom-8 text-4xl"
            style={{ left: `${f.left}%` }}
          >
            {f.mine ? "💗" : "💖"}
          </span>
        ))}
      </div>
    </main>
  );
}

function Header() {
  const router = useRouter();
  const doLock = useServerFn(lock);
  return (
    <header className="mb-5 flex items-end justify-between">
      <div>
        <h1 className="font-display text-3xl italic md:text-4xl">
          Iru <span className="text-primary font-sans not-italic">&</span> Paxat
        </h1>
        <p className="text-sm text-muted-foreground">Paris ↔ Aktobe · 4,600 km, always together</p>
      </div>
      <button
        aria-label="Log out"
        onClick={async () => {
          await doLock();
          router.navigate({ to: "/unlock" });
        }}
        className="rounded-full p-2 text-muted-foreground hover:bg-secondary"
      >
        <LogOut className="h-4 w-4" />
      </button>
    </header>
  );
}

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function WeatherTile({ who }: { who: Who }) {
  const p = PEOPLE[who];
  const now = useNow(30000);
  const { data } = useQuery({
    queryKey: ["weather", who],
    queryFn: async () => {
      const r = await fetch(
        `https://api.open-meteo.com/v1/forecast?latitude=${p.lat}&longitude=${p.lon}&current=temperature_2m,weather_code,is_day&timezone=auto`,
      );
      return (await r.json()) as { current: { temperature_2m: number; weather_code: number; is_day: number } };
    },
    refetchInterval: 15 * 60000,
  });
  const time = new Date(now).toLocaleTimeString("fr-FR", { timeZone: p.tz, hour: "2-digit", minute: "2-digit" });
  return (
    <section className={`bento ${who === "iru" ? "bg-sky/70" : "bg-butter/70"}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{p.city}</p>
          <p className="text-2xl font-semibold">{time}</p>
        </div>
        <span className="text-3xl">
          {data ? weatherEmoji(data.current.weather_code, !!data.current.is_day) : "…"}
        </span>
      </div>
      <p className="mt-3 font-display text-4xl">
        {data ? `${Math.round(data.current.temperature_2m)}°` : "--°"}
      </p>
      <p className="text-xs text-muted-foreground">at {p.name}'s</p>
    </section>
  );
}

function toLocalInput(iso?: string) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-CA");
}

function Countdown({ next, last, onSaved }: { next: string | undefined; last: string | undefined; onSaved: () => void }) {
  const now = useNow();
  const save = useServerFn(updateSettings);
  const [editing, setEditing] = useState(false);
  const [n, setN] = useState(toLocalInput(next));
  const [l, setL] = useState(toLocalInput(last));
  if (!next || !last) return null;
  const nextT = +new Date(next);
  const lastT = +new Date(last);
  const diff = Math.max(0, nextT - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff / 3600000) % 24);
  const m = Math.floor((diff / 60000) % 60);
  const s = Math.floor((diff / 1000) % 60);
  const pct = Math.min(100, Math.max(0, ((now - lastT) / (nextT - lastT)) * 100));

  return (
    <section className="bento col-span-2 bg-accent/60">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Next reunion · ~{new Date(next).toLocaleDateString("en-US", { day: "numeric", month: "long", year: "numeric" })}
        </p>
        <button aria-label="Edit dates" onClick={() => setEditing((e) => !e)} className="rounded-full p-1.5 hover:bg-card">
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </div>
      {editing ? (
        <form
          className="mt-3 grid gap-2 text-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            await save({ data: { next_meet: `${n}T12:00:00`, last_meet: `${l}T12:00:00` } });
            setEditing(false);
            onSaved();
            toast("Dates updated ✨");
          }}
        >
          <label className="flex items-center justify-between gap-2">
            Last time
            <input type="date" value={l} onChange={(e) => setL(e.target.value)} className="rounded-lg border bg-card px-2 py-1" />
          </label>
          <label className="flex items-center justify-between gap-2">
            Next time
            <input type="date" value={n} onChange={(e) => setN(e.target.value)} className="rounded-lg border bg-card px-2 py-1" />
          </label>
          <button className="rounded-full bg-primary py-1.5 text-primary-foreground">Save</button>
        </form>
      ) : (
        <>
          <div className="mt-2 flex items-baseline gap-3 font-display">
            <span className="text-5xl md:text-6xl">{d}</span>
            <span className="text-muted-foreground">days</span>
            <span className="text-xl">
              {String(h).padStart(2, "0")}:{String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
            </span>
          </div>
          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-muted-foreground">
              <span>A little closer to you</span>
              <span>{pct.toFixed(2)}%</span>
            </div>
            <progress className="reunion-progress h-2 w-full overflow-hidden rounded-full" value={pct} max={100} aria-label="Progress towards reunion" />
          </div>
        </>
      )}
    </section>
  );
}

type Mood = { emoji: string; label: string | null; created_at: string } | null;

function MoodTile({ me, other, moods, onSaved }: { me: Who; other: Who; moods: Record<Who, Mood>; onSaved: () => void }) {
  const save = useServerFn(setMood);
  const [open, setOpen] = useState(false);
  const cell = (w: Who) => {
    const mood = moods[w];
    const isToday = mood && dayKey(new Date(mood.created_at)) === dayKey(new Date());
    return (
      <div className="flex-1 rounded-2xl bg-card/80 p-3 text-center">
        <div className="text-4xl">{mood && isToday ? mood.emoji : "❔"}</div>
        <div className="mt-1 text-xs font-semibold">{PEOPLE[w].name}</div>
        <div className="truncate text-[11px] text-muted-foreground">{mood && isToday ? mood.label : "not yet"}</div>
      </div>
    );
  };
  return (
    <section className="bento col-span-2 bg-lilac/60 md:col-span-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Today's mood</p>
      <div className="mt-3 flex gap-3">
        {cell(me)}
        {cell(other)}
      </div>
      {open ? (
        <div className="mt-3 grid grid-cols-4 gap-2">
          {MOODS.map(([e, l]) => (
            <button
              key={e}
              title={l}
              onClick={async () => {
                setOpen(false);
                await save({ data: { emoji: e, label: l } });
                onSaved();
              }}
              className="rounded-xl bg-card py-2 text-2xl transition hover:scale-110"
            >
              {e}
            </button>
          ))}
        </div>
      ) : (
        <button onClick={() => setOpen(true)} className="mt-3 w-full rounded-full bg-card py-2 text-sm font-semibold">
          Change my mood
        </button>
      )}
    </section>
  );
}

function HeartTile({
  me,
  other,
  today,
  onSend,
}: {
  me: Who;
  other: Who;
  today: Record<Who, number>;
  onSend: () => void;
}) {
  const send = useServerFn(sendHeart);
  return (
    <section className="bento col-span-2 flex flex-col items-center justify-center bg-secondary/80 text-center md:col-span-1">
      <button
        aria-label="Send a heart"
        onClick={async () => {
          if (navigator.vibrate) navigator.vibrate(30);
          onSend();
          await send();
        }}
        className="pulse-soft grid h-24 w-24 place-items-center rounded-full bg-gradient-primary shadow-lg active:scale-90"
      >
        <Heart className="h-11 w-11 fill-primary-foreground text-primary-foreground" />
      </button>
      <p className="mt-3 text-sm font-semibold">Send a heart to {PEOPLE[other].name}</p>
      <p className="text-[11px] text-muted-foreground">
        today: you {today[me]} · {PEOPLE[other].name} {today[other]}
      </p>
    </section>
  );
}

type Note = { id: string; who: string; content: string; created_at: string };

function NotesTile({ me, notes, onSaved }: { me: Who; notes: Note[]; onSaved: () => void }) {
  const post = useServerFn(postNote);
  const [text, setText] = useState("");
  const now = useNow();
  const activeNotes = notes.filter((note) => isNoteActive(note.created_at, now));
  const latest = activeNotes[0];
  const rot = ["-rotate-2", "rotate-1", "-rotate-1", "rotate-2"];
  return (
    <section className="bento col-span-2 bg-cream/70 md:col-span-3">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sticky notes</p>
      <div className="mt-3 flex gap-3 overflow-x-auto pb-2">
        {activeNotes.length === 0 && <p className="text-sm text-muted-foreground">Leave the first note 💌</p>}
        {activeNotes.map((n, i) => (
          <div
            key={n.id}
            className={`min-w-[10rem] max-w-[14rem] shrink-0 rounded-md p-3 shadow-md ${rot[i % 4]} ${n.who === "iru" ? "bg-rose text-rose-foreground" : "bg-sage text-sage-foreground"} ${n === latest ? (n.who === "iru" ? "ring-2 ring-rose-foreground/50" : "ring-2 ring-sage-foreground/50") : ""}`}
          >
            <p className="whitespace-pre-wrap font-display text-base italic leading-snug">{n.content}</p>
            <p className={`mt-2 text-[10px] ${n.who === "iru" ? "text-rose-foreground/80" : "text-sage-foreground/75"}`}>
              — {PEOPLE[n.who as Who]?.name} · {new Date(n.created_at).toLocaleString("en-US", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        ))}
      </div>
      <form
        className="mt-2 flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim()) return;
          await post({ data: { content: text } });
          setText("");
          onSaved();
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          placeholder={me === "iru" ? "A little note for Рахат..." : "A little note for Iru..."}
          className="flex-1 rounded-full border border-input bg-card px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        <button aria-label="Post note" className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </section>
  );
}