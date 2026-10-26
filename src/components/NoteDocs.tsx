import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, ChevronRight, NotebookPen, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { deleteNoteDoc, saveNoteDoc } from "@/lib/ldr.functions";
import { noteDocSchema } from "@/lib/note-docs";
import type { Tables } from "@/integrations/supabase/types";

type Props = { docs: Tables<"note_docs">[]; onSaved: () => Promise<unknown> };

export function NoteDocs({ docs, onSaved }: Props) {
  const save = useServerFn(saveNoteDoc);
  const remove = useServerFn(deleteNoteDoc);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const doc = docs.find(d => d.id === selected);

  useEffect(() => {
    if (doc && !dirty) setContent(doc.content);
  }, [doc, dirty]);

  async function act(action: () => Promise<unknown>, after?: () => void) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      await onSaved();
      after?.();
    } catch {
      toast.error("The change couldn't be saved. Please try again.");
    } finally { setBusy(false); }
  }

  function close() {
    setSelected(null); setCreating(false); setEditingTitle(false); setContent(""); setDirty(false);
  }

  function openDoc(id: string) {
    const target = docs.find(d => d.id === id);
    setSelected(id);
    setEditingTitle(false);
    setContent(target?.content ?? "");
    setDirty(false);
  }

  return (
    <section className="bento col-span-2 bg-butter/60 md:col-span-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><NotebookPen className="size-4" /> Our notes</h2>
        <Button variant="ghost" size="icon" aria-label="Create a note" title="Create a note" onClick={() => { setTitle(""); setCreating(true); }}><Plus /></Button>
      </div>
      {docs.length === 0 ? (
        <div className="py-5 text-center">
          <p className="font-display text-xl italic">Our shared notebook</p>
          <p className="mb-3 mt-1 text-sm text-muted-foreground">No notes yet</p>
          <Button variant="secondary" onClick={() => { setTitle(""); setCreating(true); }}><Plus /> Create a note</Button>
        </div>
      ) : (
        <div className="mt-2 divide-y divide-border">
          {docs.map(d => (
            <Button key={d.id} variant="ghost" className="h-auto w-full justify-between gap-3 rounded-none py-4 text-left" onClick={() => openDoc(d.id)}>
              <span className="min-w-0 flex-1 whitespace-normal break-words font-display text-lg">{d.title}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{new Date(d.updated_at).toLocaleDateString("en-US", { day: "2-digit", month: "2-digit" })}</span><ChevronRight />
            </Button>
          ))}
        </div>
      )}
      <Dialog open={creating || selected !== null} onOpenChange={open => { if (!open) close(); }}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg bg-card p-5 sm:p-6">
          <DialogHeader className="pr-6 text-left">
            <DialogTitle className="break-words font-display text-2xl">{creating ? "New note" : doc?.title ?? "Note deleted"}</DialogTitle>
            <DialogDescription>{creating ? "Our shared notebook" : "Last edited on " + (doc ? new Date(doc.updated_at).toLocaleString("en-US", { day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }) : "")}</DialogDescription>
          </DialogHeader>
          {creating || (doc && editingTitle) ? (
            <form className="flex gap-2" onSubmit={e => {
              e.preventDefault();
              const parsed = noteDocSchema.safeParse({ title, id: creating ? undefined : selected });
              if (!parsed.success) return;
              void act(() => save({ data: parsed.data }), () => { setCreating(false); setEditingTitle(false); if (creating) close(); });
            }}>
              <input autoFocus aria-label="Note title" placeholder="Note title" maxLength={100} required value={title} onChange={e => setTitle(e.target.value)} className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <Button size="icon" title="Save title" aria-label="Save title" disabled={busy || !title.trim()}><Save /></Button>
              {!creating && <Button type="button" size="icon" variant="ghost" aria-label="Cancel edit" onClick={() => setEditingTitle(false)}><X /></Button>}
            </form>
          ) : doc ? (
            <div className="flex items-center justify-between border-b pb-3">
              <Button variant="ghost" size="sm" onClick={close}><ArrowLeft /> Notes</Button>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" disabled={busy} aria-label="Rename note" title="Rename note" onClick={() => { setTitle(doc.title); setEditingTitle(true); }}><Pencil /></Button>
                <Button variant="ghost" size="icon" disabled={busy} className="text-destructive" aria-label="Delete note" title="Delete note" onClick={() => {
                  if (window.confirm(`Delete "${doc.title}"?`)) void act(() => remove({ data: { id: doc.id } }), close);
                }}><Trash2 /></Button>
              </div>
            </div>
          ) : null}
          {!creating && doc && (
            <form className="flex flex-col gap-3" onSubmit={e => {
              e.preventDefault();
              const parsed = noteDocSchema.safeParse({ id: doc.id, title: doc.title, content });
              if (!parsed.success) return;
              void act(() => save({ data: parsed.data }), () => { setDirty(false); toast("Note saved ✨"); });
            }}>
              <textarea
                aria-label="Note content"
                placeholder="Write whatever you want here..."
                rows={10}
                maxLength={5000}
                value={content}
                onChange={e => { setContent(e.target.value); setDirty(true); }}
                className="min-h-48 w-full resize-y rounded-md border bg-background px-3 py-2 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-muted-foreground">{content.length}/5000{dirty ? " · unsaved" : ""}</span>
                <Button disabled={busy || !dirty} aria-label="Save note"><Save /> Save</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}