import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, ChevronRight, ListChecks, Pencil, Plus, Save, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { completeBucketItem, deleteBucketItem, deleteBucketList, saveBucketItem, saveBucketList } from "@/lib/ldr.functions";
import { bucketItemSchema, bucketListSchema, sortBucketItems } from "@/lib/bucket-lists";
import type { Tables } from "@/integrations/supabase/types";

type Props = { lists: Tables<"bucket_lists">[]; items: Tables<"bucket_items">[]; onSaved: () => Promise<unknown> };

export function BucketLists({ lists, items, onSaved }: Props) {
  const saveList = useServerFn(saveBucketList);
  const removeList = useServerFn(deleteBucketList);
  const saveItem = useServerFn(saveBucketItem);
  const removeItem = useServerFn(deleteBucketItem);
  const complete = useServerFn(completeBucketItem);
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const list = lists.find(l => l.id === selected);
  const points = sortBucketItems(items.filter(i => i.list_id === selected));
  const done = points.filter(p => p.completed).length;

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
    setSelected(null); setCreating(false); setEditingTitle(false); setEditingItem(null); setContent("");
  }

  return (
    <section className="bento col-span-2 bg-mint/60 md:col-span-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground"><ListChecks className="size-4" /> Our bucket lists</h2>
        <Button variant="ghost" size="icon" aria-label="Create a list" title="Create a list" onClick={() => { setTitle(""); setCreating(true); }}><Plus /></Button>
      </div>
      {lists.length === 0 ? (
        <div className="py-5 text-center">
          <p className="font-display text-xl italic">Our shared dreams</p>
          <p className="mb-3 mt-1 text-sm text-muted-foreground">No lists yet</p>
          <Button variant="secondary" onClick={() => { setTitle(""); setCreating(true); }}><Plus /> Create a list</Button>
        </div>
      ) : (
        <div className="mt-2 divide-y divide-border">
          {lists.map(l => {
            const all = items.filter(i => i.list_id === l.id);
            const count = all.filter(i => i.completed).length;
            return <Button key={l.id} variant="ghost" className="h-auto w-full justify-between gap-3 rounded-none py-4 text-left" onClick={() => { setSelected(l.id); setEditingTitle(false); }}>
              <span className="min-w-0 flex-1 whitespace-normal break-words font-display text-lg">{l.title}</span>
              <span className="shrink-0 font-mono text-xs text-muted-foreground">{count}/{all.length}</span><ChevronRight />
            </Button>;
          })}
        </div>
      )}
      <Dialog open={creating || selected !== null} onOpenChange={open => { if (!open) close(); }}>
        <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-lg bg-card p-5 sm:p-6">
          <DialogHeader className="pr-6 text-left">
            <DialogTitle className="break-words font-display text-2xl">{creating ? "New list" : list?.title ?? "List deleted"}</DialogTitle>
            <DialogDescription>{creating ? "Our shared dreams" : `${done}/${points.length} items completed`}</DialogDescription>
          </DialogHeader>
          {creating || (list && editingTitle) ? (
            <form className="flex gap-2" onSubmit={e => {
              e.preventDefault();
              const parsed = bucketListSchema.safeParse({ title, id: creating ? undefined : selected });
              if (!parsed.success) return;
              void act(() => saveList({ data: parsed.data }), () => { setCreating(false); setEditingTitle(false); if (creating) close(); });
            }}>
              <input autoFocus aria-label="List name" placeholder="List name" maxLength={100} required value={title} onChange={e => setTitle(e.target.value)} className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <Button size="icon" title="Save list" aria-label="Save list" disabled={busy || !title.trim()}><Save /></Button>
              {!creating && <Button type="button" size="icon" variant="ghost" aria-label="Cancel edit" onClick={() => setEditingTitle(false)}><X /></Button>}
            </form>
          ) : list ? (
            <div className="flex items-center justify-between border-b pb-3">
              <Button variant="ghost" size="sm" onClick={close}><ArrowLeft /> Lists</Button>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" disabled={busy} aria-label="Edit list" title="Edit list" onClick={() => { setTitle(list.title); setEditingTitle(true); }}><Pencil /></Button>
                <Button variant="ghost" size="icon" disabled={busy} className="text-destructive" aria-label="Delete list" title="Delete list" onClick={() => {
                  if (window.confirm(`Delete "${list.title}" and all its items?`)) void act(() => removeList({ data: { id: list.id } }), close);
                }}><Trash2 /></Button>
              </div>
            </div>
          ) : null}
          {!creating && list && <>
            {points.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">No items yet</p>}
            <ul className="divide-y divide-border">
              {points.map(point => <li key={point.id} className="flex items-start gap-2 py-3">
                <Button variant={point.completed ? "secondary" : "outline"} size="icon" className="size-8 shrink-0" aria-label={`${point.completed ? "Reopen" : "Complete"} : ${point.content}`} title={point.completed ? "Reopen item" : "Complete item"} aria-pressed={point.completed} disabled={busy} onClick={() => void act(() => complete({ data: { id: point.id, completed: !point.completed } }))}>{point.completed && <Check />}</Button>
                <div className="min-w-0 flex-1 pt-1">
                  <p className={`whitespace-pre-wrap break-words text-sm ${point.completed ? "text-muted-foreground line-through" : ""}`}>{point.content}</p>
                  {point.completed && <span className="mt-1 block text-xs font-semibold text-muted-foreground">Completed</span>}
                </div>
                <Button variant="ghost" size="icon" className="size-8 shrink-0" aria-label={`Edit : ${point.content}`} title="Edit item" disabled={busy} onClick={() => { setEditingItem(point.id); setContent(point.content); }}><Pencil /></Button>
                <Button variant="ghost" size="icon" className="size-8 shrink-0 text-destructive" aria-label={`Delete : ${point.content}`} title="Delete item" disabled={busy} onClick={() => {
                  if (window.confirm("Delete this item?")) void act(() => removeItem({ data: { id: point.id } }), () => { if (editingItem === point.id) { setEditingItem(null); setContent(""); } });
                }}><Trash2 /></Button>
              </li>)}
            </ul>
            <form className="flex items-start gap-2 border-t pt-4" onSubmit={e => {
              e.preventDefault();
              const parsed = bucketItemSchema.safeParse({ list_id: list.id, content, id: editingItem ?? undefined });
              if (!parsed.success) return;
              void act(() => saveItem({ data: parsed.data }), () => { setContent(""); setEditingItem(null); });
            }}>
              <textarea aria-label={editingItem ? "Edit item" : "New item"} placeholder="A dream, an adventure…" rows={2} required maxLength={280} value={content} onChange={e => setContent(e.target.value)} className="min-w-0 flex-1 resize-y rounded-md border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
              <Button size="icon" disabled={busy || !content.trim()} aria-label={editingItem ? "Save item" : "Add item"} title={editingItem ? "Save item" : "Add item"}>{editingItem ? <Save /> : <Plus />}</Button>
              {editingItem && <Button type="button" variant="ghost" size="icon" aria-label="Cancel edit" onClick={() => { setEditingItem(null); setContent(""); }}><X /></Button>}
            </form>
          </>}
        </DialogContent>
      </Dialog>
    </section>
  );
}