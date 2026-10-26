import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Check, MessageCircleQuestion, Plus, Shuffle } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { addQuestion, answerQuestion, drawQuestion } from "@/lib/ldr.functions";
import { getDrawnQuestion } from "@/lib/questions";
import type { Tables } from "@/integrations/supabase/types";

type Props = {
  questions: Tables<"questions">[];
  drawnId: string | null | undefined;
  onSaved: () => Promise<unknown>;
};

export function Questions({ questions, drawnId, onSaved }: Props) {
  const add = useServerFn(addQuestion);
  const draw = useServerFn(drawQuestion);
  const answer = useServerFn(answerQuestion);
  const [content, setContent] = useState("");
  const [busy, setBusy] = useState(false);
  const drawn = getDrawnQuestion(questions, drawnId);

  async function act(action: () => Promise<unknown>, after?: () => void) {
    if (busy) return;
    setBusy(true);
    try {
      await action();
      after?.();
      await onSaved();
    } catch {
      toast.error("The change couldn't be saved. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="bento col-span-2 min-w-0 bg-secondary/60 md:col-span-4" aria-label="Our questions">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <MessageCircleQuestion className="size-4" /> Our questions
        </h2>
        <span className="font-mono text-xs text-muted-foreground">{questions.length} pending</span>
      </div>

      <div className="py-5" aria-live="polite">
        {drawn ? (
          <>
            <p className="mb-2 text-xs font-semibold text-muted-foreground">Current question</p>
            <p className="whitespace-pre-wrap break-words font-display text-2xl italic">{drawn.content}</p>
            <p className="mt-2 text-xs text-muted-foreground">— {drawn.who === "iru" ? "Iru" : "Рахат"}</p>
          </>
        ) : (
          <p className="font-display text-xl italic">{questions.length ? "A little of you, a little of us..." : "What would you like to know about me?"}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant={drawn ? "outline" : "default"} disabled={busy || questions.length === 0} onClick={() => void act(() => draw())}>
          <Shuffle /> Draw a question
        </Button>
        {drawn && <Button disabled={busy} onClick={() => void act(() => answer({ data: { id: drawn.id } }), () => toast.success("Question answered and cleared 💗"))}><Check /> Answered</Button>}
      </div>

      <form className="mt-5 flex items-start gap-2 border-t border-border pt-4" onSubmit={event => {
        event.preventDefault();
        if (!content.trim()) return;
        void act(() => add({ data: { content } }), () => setContent(""));
      }}>
        <textarea aria-label="New question" placeholder="A question for you..." required maxLength={1000} rows={2} value={content} onChange={event => setContent(event.target.value)} className="min-w-0 flex-1 resize-y rounded-md border border-input bg-card px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        <Button size="icon" aria-label="Add question" title="Add question" disabled={busy || !content.trim()}><Plus /></Button>
      </form>

      <details className="mt-4 border-t border-border pt-3">
        <summary className="cursor-pointer text-sm font-semibold">All our questions ({questions.length})</summary>
        {questions.length === 0 ? <p className="py-3 text-sm text-muted-foreground">No pending questions</p> : <ul className="mt-2 max-h-72 divide-y divide-border overflow-y-auto">
          {questions.map(question => <li key={question.id} className="flex items-start gap-3 py-3">
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-wrap break-words text-sm">{question.content}</p>
              <p className="mt-1 text-xs text-muted-foreground">— {question.who === "iru" ? "Iru" : "Рахат"}</p>
            </div>
            <Button variant="ghost" size="icon" className="shrink-0" aria-label={`Mark as answered: ${question.content}`} title="Answered — delete question" disabled={busy} onClick={() => void act(() => answer({ data: { id: question.id } }), () => toast.success("Question answered and cleared 💗"))}><Check /></Button>
          </li>)}
        </ul>}
      </details>
    </section>
  );
}
