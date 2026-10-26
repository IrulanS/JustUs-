import { createServerFn } from "@tanstack/react-start";
import { useSession } from "@tanstack/react-start/server";
import { createHash, timingSafeEqual } from "node:crypto";
import { bucketIdSchema, bucketListSchema, bucketItemSchema, bucketCompletionSchema } from "./bucket-lists";
import { questionSchema, questionIdSchema } from "./questions";
import { noteDocIdSchema, noteDocSchema } from "./note-docs";
import { noteExpiryCutoff } from "./notes";

export type Who = "iru" | "paxat";
type LdrSession = { who?: Who };

function sessionConfig() {
  return {
    password: process.env["SESSION_SECRET"]!,
    name: "ldr-gate",
    maxAge: 60 * 60 * 24 * 365,
    cookie: { httpOnly: true, secure: true, sameSite: "none" as const, path: "/" },
  };
}

function matches(input: string, expected: string) {
  const a = createHash("sha256").update(input, "utf8").digest();
  const b = createHash("sha256").update(expected, "utf8").digest();
  return timingSafeEqual(a, b);
}

async function requireWho(): Promise<Who> {
  const s = await useSession<LdrSession>(sessionConfig());
  if (!s.data.who) throw new Error("locked");
  return s.data.who;
}

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export const getMe = createServerFn({ method: "GET" }).handler(async () => {
  const s = await useSession<LdrSession>(sessionConfig());
  return { who: s.data.who ?? null };
});

export const unlock = createServerFn({ method: "POST" })
  .validator((d: { password: string; who: Who }) => {
    if (d.who !== "iru" && d.who !== "paxat") throw new Error("bad who");
    return { password: String(d.password).slice(0, 200), who: d.who };
  })
  .handler(async ({ data }) => {
    const expected = process.env["SITE_PASSWORD"];
    if (!expected) throw new Error("SITE_PASSWORD is not set");
    if (!matches(data.password, expected)) return { ok: false as const };
    const s = await useSession<LdrSession>(sessionConfig());
    await s.update({ who: data.who });
    return { ok: true as const };
  });

export const lock = createServerFn({ method: "POST" }).handler(async () => {
  const s = await useSession<LdrSession>(sessionConfig());
  await s.clear();
  return { ok: true };
});

export const getDashboard = createServerFn({ method: "GET" }).handler(async () => {
  const who = await requireWho();
  const sb = await db();
  const now = Date.now();
  const since = new Date(now - 2 * 86400000).toISOString();

  const [settings, moods, notes, hearts, bucketLists, bucketItems, questions, noteDocs] = await Promise.all([
    sb.from("settings").select("*").eq("id", 1).single(),
    sb.from("moods").select("id, who, emoji, label, created_at").order("created_at", { ascending: false }).limit(2000),
    sb.from("notes").select("id, who, content, created_at").gt("created_at", noteExpiryCutoff(now)).order("created_at", { ascending: false }).limit(6),
    sb.from("hearts").select("id, who, created_at").gte("created_at", since).order("created_at", { ascending: false }).limit(5000),
    sb.from("bucket_lists").select("*").order("created_at", { ascending: true }),
    sb.from("bucket_items").select("*").order("created_at", { ascending: true }),
    sb.from("questions").select("*").order("created_at", { ascending: true }),
    sb.from("note_docs").select("*").order("updated_at", { ascending: false }),
  ]);
  if (bucketLists.error || bucketItems.error) throw new Error("Failed to load bucket lists.");
  if (questions.error) throw new Error("Failed to load your questions.");

  const latestMood = (w: Who) => (moods.data ?? []).find((m) => m.who === w) ?? null;
  const today = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
  const heartsToday = (w: Who) =>
    (hearts.data ?? []).filter(
      (h) => h.who === w && new Date(h.created_at).toLocaleDateString("en-CA", { timeZone: "Europe/Paris" }) === today,
    ).length;

  return {
    who,
    settings: settings.data,
    moods: { iru: latestMood("iru"), paxat: latestMood("paxat") },
    notes: (notes.data ?? []).slice(0, 6),
    recentHearts: (hearts.data ?? []).slice(0, 30),
    heartsToday: { iru: heartsToday("iru"), paxat: heartsToday("paxat") },
    bucketLists: bucketLists.data ?? [],
    bucketItems: bucketItems.data ?? [],
    questions: questions.data ?? [],
    noteDocs: noteDocs.data ?? [],
  };
});

export const setMood = createServerFn({ method: "POST" })
  .validator((d: { emoji: string; label: string }) => ({
    emoji: String(d.emoji).slice(0, 8),
    label: String(d.label ?? "").slice(0, 40),
  }))
  .handler(async ({ data }) => {
    const who = await requireWho();
    const sb = await db();
    await sb.from("moods").insert({ who, emoji: data.emoji, label: data.label });
    return { ok: true };
  });

export const postNote = createServerFn({ method: "POST" })
  .validator((d: { content: string }) => {
    const content = String(d.content ?? "").trim().slice(0, 280);
    if (!content) throw new Error("empty");
    return { content };
  })
  .handler(async ({ data }) => {
    const who = await requireWho();
    const sb = await db();
    await sb.from("notes").insert({ who, content: data.content });
    return { ok: true };
  });

export const sendHeart = createServerFn({ method: "POST" }).handler(async () => {
  const who = await requireWho();
  const sb = await db();
  await sb.from("hearts").insert({ who });
  return { ok: true };
});

export const updateSettings = createServerFn({ method: "POST" })
  .validator((d: { next_meet: string; last_meet: string }) => {
    const n = new Date(d.next_meet);
    const l = new Date(d.last_meet);
    if (isNaN(+n) || isNaN(+l)) throw new Error("bad date");
    return { next_meet: n.toISOString(), last_meet: l.toISOString() };
  })
  .handler(async ({ data }) => {
    await requireWho();
    const sb = await db();
    await sb.from("settings").update(data).eq("id", 1);
    return { ok: true };
  });

export const saveBucketList = createServerFn({ method: "POST" })
  .validator((data: { id?: string | undefined; title: string }) => bucketListSchema.parse(data))
  .handler(async ({ data }) => {
    const who = await requireWho();
    const sb = await db();
    const result = data.id
      ? await sb.from("bucket_lists").update({ title: data.title }).eq("id", data.id).select("id").single()
      : await sb.from("bucket_lists").insert({ title: data.title, who }).select("id").single();
    if (result.error) throw new Error("Failed to save this list.");
    return result.data;
  });

export const deleteBucketList = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => bucketIdSchema.parse(data))
  .handler(async ({ data }) => {
    await requireWho();
    const sb = await db();
    const { error } = await sb.from("bucket_lists").delete().eq("id", data.id);
    if (error) throw new Error("Failed to delete this list.");
    return { ok: true };
  });

export const saveBucketItem = createServerFn({ method: "POST" })
  .validator((data: { id?: string | undefined; list_id: string; content: string }) => bucketItemSchema.parse(data))
  .handler(async ({ data }) => {
    const who = await requireWho();
    const sb = await db();
    const result = data.id
      ? await sb.from("bucket_items").update({ content: data.content }).eq("id", data.id).eq("list_id", data.list_id).select("id").single()
      : await sb.from("bucket_items").insert({ list_id: data.list_id, content: data.content, who }).select("id").single();
    if (result.error) throw new Error("Failed to save this item.");
    return result.data;
  });

export const completeBucketItem = createServerFn({ method: "POST" })
  .validator((data: { id: string; completed: boolean }) => bucketCompletionSchema.parse(data))
  .handler(async ({ data }) => {
    await requireWho();
    const sb = await db();
    const { error } = await sb.from("bucket_items").update({ completed: data.completed }).eq("id", data.id).select("id").single();
    if (error) throw new Error("Failed to complete this item.");
    return { ok: true };
  });

export const deleteBucketItem = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => bucketIdSchema.parse(data))
  .handler(async ({ data }) => {
    await requireWho();
    const sb = await db();
    const { error } = await sb.from("bucket_items").delete().eq("id", data.id);
    if (error) throw new Error("Failed to delete this item.");
    return { ok: true };
  });

export const addQuestion = createServerFn({ method: "POST" })
  .validator((data: { content: string }) => questionSchema.parse(data))
  .handler(async ({ data }) => {
    const who = await requireWho();
    const sb = await db();
    const { error } = await sb.from("questions").insert({ content: data.content, who });
    if (error) throw new Error("Failed to add this question.");
    return { ok: true };
  });

export const drawQuestion = createServerFn({ method: "POST" }).handler(async () => {
  await requireWho();
  const sb = await db();
  const { data, error } = await sb.rpc("draw_shared_question");
  if (error) throw new Error("Failed to draw a question.");
  return { id: data as string | null };
});

export const answerQuestion = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => questionIdSchema.parse(data))
  .handler(async ({ data }) => {
    await requireWho();
    const sb = await db();
    const { error } = await sb.from("questions").delete().eq("id", data.id);
    if (error) throw new Error("Failed to clear this question.");
    return { ok: true };
  });

export const saveNoteDoc = createServerFn({ method: "POST" })
  .validator((data: { id?: string | undefined; title: string; content?: string | undefined }) => noteDocSchema.parse(data))
  .handler(async ({ data }) => {
    const who = await requireWho();
    const sb = await db();
    const result = data.id
      ? await sb.from("note_docs").update({
          title: data.title,
          ...(data.content !== undefined ? { content: data.content } : {}),
          updated_at: new Date().toISOString(),
        }).eq("id", data.id).select("id").single()
      : await sb.from("note_docs").insert({ title: data.title, content: data.content ?? "", who }).select("id").single();
    if (result.error) throw new Error("Failed to save this note.");
    return result.data;
  });

export const deleteNoteDoc = createServerFn({ method: "POST" })
  .validator((data: { id: string }) => noteDocIdSchema.parse(data))
  .handler(async ({ data }) => {
    await requireWho();
    const sb = await db();
    const { error } = await sb.from("note_docs").delete().eq("id", data.id);
    if (error) throw new Error("Failed to delete this note.");
    return { ok: true };
  });